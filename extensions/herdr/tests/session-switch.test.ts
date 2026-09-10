import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { switchToSession } from "../src/lib/session-switch";
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
  terminalApplication: { bundleId: "com.github.wez.wezterm", name: "WezTerm", path: "/Applications/WezTerm.app" },
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

interface Fixture {
  processes: Process[];
  panes: Array<{ window_id: number; pane_id: number; tty_name: string }>;
  spawnResult?: string | Error;
}

const events: string[] = [];
const kill = vi.fn((pid: number) => {
  events.push(`kill ${pid}`);
});

// One execFile dispatcher stands in for pgrep, ps, the WezTerm CLI, and `open`,
// so the test drives the real lookup, launch, and switch wiring end to end.
function mockSystem(fixture: Fixture) {
  vi.mocked(execFile).mockImplementation(((
    path: string,
    args: string[],
    _options: unknown,
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    const respond = (stdout: string) => callback(null, stdout, "");
    if (path.endsWith("pgrep")) {
      events.push("pgrep");
      if (fixture.processes.length === 0) return callback(Object.assign(new Error("no match"), { code: 1 }), "", "");
      return respond(fixture.processes.map((process) => process.pid).join("\n"));
    }
    if (path === "/bin/ps") {
      events.push("ps");
      const withPid = args.includes("pid=,tty=,comm=,args=");
      return respond(
        fixture.processes
          .map((process) => `${withPid ? `${process.pid} ` : ""}${process.tty} herdr ${process.args}`)
          .join("\n"),
      );
    }
    if (path.endsWith("wezterm")) {
      events.push(`wezterm ${args[1]}${args[1] === "spawn" ? ` ${args.slice(2).join(" ")}` : ""}`);
      if (args[1] === "list") return respond(JSON.stringify(fixture.panes));
      if (args[1] === "spawn") {
        const result = fixture.spawnResult ?? "77";
        return result instanceof Error ? callback(result, "", "") : respond(result);
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

beforeEach(() => {
  storage.clear();
  storage.set("selectedSession", "tmp-a");
  events.length = 0;
  kill.mockClear();
  vi.mocked(execFile).mockReset();
});

const previousClient: Process = { pid: "101", tty: "ttys001", args: `${binary} session attach tmp-a` };
const previousPane = { window_id: 3, pane_id: 5, tty_name: "/dev/ttys001" };

describe("switchToSession", () => {
  it("spawns the new client into the previous client's window before detaching it", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane] });

    const result = await switchToSession("tmp-b", kill);

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

    const result = await switchToSession("tmp-b", kill);

    expect(result).toEqual({ outcome: "revealed", previous: "tmp-a", detached: 0 });
    expect(storage.get("selectedSession")).toBe("tmp-b");
    expect(kill).not.toHaveBeenCalled();
    expect(events).toContain("wezterm activate-pane");
    expect(events.some((event) => event.startsWith("wezterm spawn"))).toBe(false);
  });

  it("attaches alongside and says so when the previous session has no client in a terminal pane", async () => {
    mockSystem({ processes: [], panes: [{ window_id: 9, pane_id: 1, tty_name: "/dev/ttys009" }] });

    const result = await switchToSession("tmp-b", kill);

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
    });

    const result = await switchToSession("tmp-b", kill);

    expect(result).toMatchObject({ outcome: "attached", detached: 0 });
    expect(kill).not.toHaveBeenCalled();
  });

  it("detaches nothing when the new client cannot be launched", async () => {
    mockSystem({ processes: [previousClient], panes: [previousPane], spawnResult: new Error("spawn failed") });

    await expect(switchToSession("tmp-b", kill)).rejects.toThrow();
    expect(kill).not.toHaveBeenCalled();
  });

  it("does not detach clients of the target when switching to the selected session", async () => {
    storage.set("selectedSession", "tmp-b");
    mockSystem({ processes: [], panes: [previousPane] });

    const result = await switchToSession("tmp-b", kill);

    expect(result).toMatchObject({ outcome: "attached", previous: "tmp-b", detached: 0 });
    expect(kill).not.toHaveBeenCalled();
  });
});
