import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { switchToSession, type Kill } from "../src/lib/session-switch";
import { storage } from "./helpers/raycast-api";

vi.mock("node:child_process", () => ({ execFile: vi.fn(), spawn: vi.fn() }));
vi.mock("node:fs/promises", () => ({
  access: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock("@raycast/api", () => import("./helpers/raycast-api"));

const preferences = {
  herdrPath: "~/.local/bin/herdr",
  sessionName: undefined as string | undefined,
  customTerminalLauncher: undefined as string | undefined,
  terminalApplication: { bundleId: "", name: "", path: "" },
};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

const binary = join(homedir(), ".local", "bin", "herdr");

interface Process {
  pid: string;
  tty: string;
  args: string;
}

type Pane = { window_id: number; pane_id: number; tty_name: string };

interface Fixture {
  processes: Process[];
  panes: Pane[];
  spawnResult?: string | Error;
  /** What the spawned Client adds to the process list and pane listing. */
  spawned?: { processes?: Process[]; panes?: Pane[] };
}

const events: string[] = [];
const kill = vi.fn((pid: number) => {
  events.push(`kill ${pid}`);
});

// One execFile dispatcher stands in for pgrep, ps, the WezTerm CLI, and `open`,
// so the test drives the real lookup, launch, and switch wiring end to end.
function mockSystem(fixture: Fixture) {
  let spawned = false;
  const processes = () => [...fixture.processes, ...(spawned ? fixture.spawned?.processes ?? [] : [])];
  const panes = () => [...fixture.panes, ...(spawned ? fixture.spawned?.panes ?? [] : [])];

  vi.mocked(execFile).mockImplementation(((
    path: string,
    args: string[],
    _options: unknown,
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    const respond = (stdout: string) => callback(null, stdout, "");
    if (path.endsWith("pgrep")) {
      events.push("pgrep");
      if (processes().length === 0) return callback(Object.assign(new Error("no match"), { code: 1 }), "", "");
      return respond(processes().map((process) => process.pid).join("\n"));
    }
    if (path === "/bin/ps") {
      events.push("ps");
      // The one column set both lookups use: pid, tty, then the whole argv.
      expect(args).toEqual(["-p", processes().map((process) => process.pid).join(","), "-o", "pid=,tty=,args="]);
      return respond(processes().map((process) => `${process.pid} ${process.tty} ${process.args}`).join("\n"));
    }
    if (path.endsWith("wezterm")) {
      events.push(`wezterm ${args[1]}${args[1] === "spawn" ? ` ${args.slice(2).join(" ")}` : ""}`);
      if (args[1] === "list") return respond(JSON.stringify(panes()));
      if (args[1] === "spawn") {
        const result = fixture.spawnResult ?? "77";
        if (result instanceof Error) return callback(result, "", "");
        spawned = true;
        return respond(result);
      }
      return respond("");
    }
    if (path === "/usr/bin/open") {
      events.push("open");
      if (fixture.spawnResult instanceof Error) return callback(fixture.spawnResult, "", "");
      return respond("");
    }
    return callback(new Error(`unexpected command ${path} ${args.join(" ")}`), "", "");
  }) as never);
}

const wezterm = {
  bundleId: "com.github.wez.wezterm",
  name: "WezTerm",
  path: "/Applications/WezTerm.app",
};

beforeEach(() => {
  // Reset the terminal: a later test switches it, and the mutation would leak.
  preferences.terminalApplication = { ...wezterm };
  storage.clear();
  storage.set("selectedSession", "tmp-a");
  events.length = 0;
  kill.mockClear();
  vi.mocked(execFile).mockReset();
  vi.mocked(spawn).mockReset();
  const child = {
    once(event: string, callback: () => void) {
      if (event === "spawn") callback();
      return child;
    },
    unref() {},
  };
  vi.mocked(spawn).mockReturnValue(child as never);
});

const previousClient: Process = { pid: "101", tty: "ttys001", args: `${binary} session attach tmp-a` };
const previousPane = { window_id: 3, pane_id: 5, tty_name: "/dev/ttys001" };
// What a successful `session attach tmp-b` leaves behind: a Client process on a
// tty the terminal reports as one of its panes.
const targetClient: Process = { pid: "901", tty: "ttys090", args: `${binary} session attach tmp-b` };
const targetPane = { window_id: 3, pane_id: 77, tty_name: "/dev/ttys090" };
const spawnedTarget = { processes: [targetClient], panes: [targetPane] };

// Polling is instant in tests; the production defaults are in session-switch.ts.
function switchOptions(kill: Kill) {
  return { kill, confirmTimeoutMs: 50, confirmPollMs: 0 };
}

describe("switchToSession", () => {
  it("spawns the new client into the previous client's window before detaching it", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane], spawned: spawnedTarget });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toEqual({ outcome: "attached", previous: "tmp-a", detached: 1 });
    expect(storage.get("selectedSession")).toBe("tmp-b");
    expect(kill).toHaveBeenCalledWith(101, "SIGTERM");
    const spawnIndex = events.findIndex((event) => event.startsWith("wezterm spawn"));
    expect(events[spawnIndex]).toBe(`wezterm spawn --window-id 3 -- ${binary} session attach tmp-b`);
    expect(spawnIndex).toBeGreaterThan(-1);
    expect(events.indexOf("kill 101")).toBeGreaterThan(spawnIndex);
  });

  it("reveals an existing client of the target instead of spawning or detaching", async () => {
    const targetClient: Process = { pid: "202", tty: "ttys002", args: `${binary} --session tmp-b` };
    mockSystem({
      processes: [previousClient, targetClient],
      panes: [previousPane, { window_id: 3, pane_id: 6, tty_name: "/dev/ttys002" }],
    });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toEqual({ outcome: "revealed", previous: "tmp-a", detached: 0 });
    expect(storage.get("selectedSession")).toBe("tmp-b");
    expect(kill).not.toHaveBeenCalled();
    expect(events).toContain("wezterm activate-pane");
    expect(events.some((event) => event.startsWith("wezterm spawn"))).toBe(false);
  });

  it("attaches alongside and says so when the previous session has no client in a terminal pane", async () => {
    mockSystem({ processes: [], panes: [{ window_id: 9, pane_id: 1, tty_name: "/dev/ttys009" }], spawned: spawnedTarget });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", previous: "tmp-a", detached: 0 });
    expect(result.skipped).toContain("tmp-a");
    expect(kill).not.toHaveBeenCalled();
    expect(events).toContain(`wezterm spawn --window-id 9 -- ${binary} session attach tmp-b`);
  });

  // The remote bridge is a bare `herdr client`, and a `--remote` attach targets
  // another host; neither may be signalled even from a terminal pane.
  it("never detaches the remote bridge or a remote attach", async () => {
    storage.set("selectedSession", "default");
    mockSystem({
      processes: [
        { pid: "301", tty: "ttys041", args: `${binary} --remote clouddesk --session default` },
        { pid: "302", tty: "ttys041", args: `${binary} client` },
      ],
      panes: [{ window_id: 2, pane_id: 8, tty_name: "/dev/ttys041" }],
      spawned: spawnedTarget,
    });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", detached: 0 });
    expect(kill).not.toHaveBeenCalled();
  });

  // Regression: the selection was persisted before the launch, so a failed
  // switch left every command pointed at a session the terminal never showed.
  it("keeps the previous selection when the new client cannot be launched", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane], spawnResult: new Error("spawn failed") });

    await expect(switchToSession("tmp-b", switchOptions(kill))).rejects.toThrow();
    expect(kill).not.toHaveBeenCalled();
    expect(storage.get("selectedSession")).toBe("tmp-a");
  });

  // Regression: a `found` location whose signals all failed reported zero
  // detached with no reason, which rendered as "Attached alongside: undefined".
  it("says the previous clients survived when every signal fails", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane], spawned: spawnedTarget });
    const failing = vi.fn(() => {
      throw Object.assign(new Error("no such process"), { code: "ESRCH" });
    });

    const result = await switchToSession("tmp-b", switchOptions(failing));

    expect(result).toMatchObject({ outcome: "attached", detached: 0 });
    expect(result.skipped).toBeTruthy();
    expect(result.skipped).not.toContain("undefined");
  });

  it("does not detach clients of the target when switching to the selected session", async () => {
    storage.set("selectedSession", "tmp-b");
    mockSystem({ processes: [], panes: [previousPane], spawned: spawnedTarget });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", previous: "tmp-b", detached: 0 });
    expect(kill).not.toHaveBeenCalled();
    // Regression: this branch claimed no client of the session was open in a
    // terminal pane without ever looking.
    expect(result.skipped).not.toContain("terminal pane");
  });

  // Regression: a terminal that cannot list its panes was reported as "no
  // client is open", a claim the extension never checked.
  it("reports that the terminal cannot list panes rather than claiming no client", async () => {
    preferences.terminalApplication = { bundleId: "net.kovidgoyal.kitty", name: "kitty", path: "/Applications/kitty.app" };
    mockSystem({ processes: [previousClient], panes: [], spawned: spawnedTarget });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", detached: 0 });
    expect(result.skipped).toContain("kitty");
    expect(result.skipped).not.toContain("terminal pane");
    expect(kill).not.toHaveBeenCalled();
  });
});

describe("switchToSession confirmation", () => {
  // Regression: the old client was signaled as soon as the spawn returned. A
  // spawn only proves the terminal ran the command; Herdr can still exit, and
  // the user then lost the client they had and gained nothing.
  it("leaves the previous clients and the selection alone when no client appears", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane] });

    await expect(switchToSession("tmp-b", switchOptions(kill))).rejects.toThrow(/tmp-b/);
    expect(kill).not.toHaveBeenCalled();
    expect(storage.get("selectedSession")).toBe("tmp-a");
  });

  it("selects and detaches once the client is discoverable", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane], spawned: spawnedTarget });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", detached: 1 });
    expect(storage.get("selectedSession")).toBe("tmp-b");
    const spawnIndex = events.findIndex((event) => event.startsWith("wezterm spawn"));
    // The confirmation lookup runs between the spawn and the signal.
    expect(events.lastIndexOf("ps")).toBeGreaterThan(spawnIndex);
    expect(events.indexOf("kill 101")).toBeGreaterThan(events.lastIndexOf("ps"));
  });
});

describe("switchToSession detach scope", () => {
  // Regression: every located client was signaled while only one replacement
  // was spawned, so any other window holding a single client just closed.
  it("detaches only the clients in the window the replacement reuses", async () => {
    const otherWindowClient: Process = { pid: "102", tty: "ttys002", args: `${binary} session attach tmp-a` };
    mockSystem({
      processes: [previousClient, otherWindowClient],
      panes: [previousPane, { window_id: 8, pane_id: 6, tty_name: "/dev/ttys002" }],
      spawned: spawnedTarget,
    });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", detached: 1 });
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith(101, "SIGTERM");
    expect(result.skipped).toMatch(/1 client/);
  });

  it("detaches both clients when they share the reused window", async () => {
    const sameWindowClient: Process = { pid: "103", tty: "ttys003", args: `${binary} session attach tmp-a` };
    mockSystem({
      processes: [previousClient, sameWindowClient],
      panes: [previousPane, { window_id: 3, pane_id: 7, tty_name: "/dev/ttys003" }],
      spawned: spawnedTarget,
    });

    const result = await switchToSession("tmp-b", switchOptions(kill));

    expect(result).toMatchObject({ outcome: "attached", detached: 2 });
    expect(result.skipped).toBeUndefined();
  });
});
