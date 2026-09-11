import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HerdrError, focusResource, getSnapshot, resolveHerdrBinary, runHerdr } from "../src/lib/herdr";
import { storage } from "./helpers/raycast-api";

vi.mock("node:fs/promises", () => ({ access: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: vi.fn() }));
vi.mock("@raycast/api", () => import("./helpers/raycast-api"));

const preferences: { herdrPath?: string; sessionName?: string } = {};
vi.mock("../src/lib/preferences", () => ({
  getHerdrPreferences: () => preferences,
}));

beforeEach(() => {
  preferences.herdrPath = "~/.local/bin/herdr";
  preferences.sessionName = undefined;
  storage.clear();
  vi.mocked(access).mockReset().mockResolvedValue();
  vi.mocked(execFile).mockReset();
});

describe("resolveHerdrBinary", () => {
  it("expands a leading tilde in the configured binary path", async () => {
    const expected = join(homedir(), ".local", "bin", "herdr");

    await expect(resolveHerdrBinary()).resolves.toBe(expected);
    expect(access).toHaveBeenCalledWith(expected, constants.X_OK);
  });

  it("expands a $HOME prefix in the configured binary path", async () => {
    preferences.herdrPath = "$HOME/.local/bin/herdr";
    const expected = join(homedir(), ".local", "bin", "herdr");

    await expect(resolveHerdrBinary()).resolves.toBe(expected);
    expect(access).toHaveBeenCalledWith(expected, constants.X_OK);
  });
});

function mockExecFileSuccess() {
  // execFile's promisify-compatible callback signature: the callback is the
  // last argument after (file, args, options).
  vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
    const callback = callArgs.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
    callback(null, "{}", "");
    return {};
  }) as never);
}

function executedArgs(): unknown {
  return vi.mocked(execFile).mock.calls[0][1];
}

function mockExecFileFailure(stderr: string) {
  vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
    const callback = callArgs.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
    callback(Object.assign(new Error("Command failed"), { code: 1 }), "", stderr);
    return {};
  }) as never);
}

describe("runHerdr", () => {
  // Regression: without a --session flag the CLI falls back to an inherited
  // HERDR_SESSION, so a value leaking into the Raycast process environment
  // could silently retarget every command.
  it("selects the configured session with the --session flag", async () => {
    preferences.sessionName = "work";
    mockExecFileSuccess();

    await runHerdr(["pane", "list"]);
    expect(executedArgs()).toEqual(["--session", "work", "pane", "list"]);
  });

  it("names the default session explicitly when no session is configured", async () => {
    preferences.sessionName = undefined;
    mockExecFileSuccess();

    await runHerdr(["pane", "list"]);
    expect(executedArgs()).toEqual(["--session", "default", "pane", "list"]);
  });

  it("omits the session flag when a command opts out with an empty session", async () => {
    preferences.sessionName = "work";
    mockExecFileSuccess();

    await runHerdr(["session", "list", "--json"], { session: "" });
    expect(executedArgs()).toEqual(["session", "list", "--json"]);
  });

  it("targets the Selected Session ahead of the configured session", async () => {
    storage.set("selectedSession", "tmp-b");
    preferences.sessionName = "work";
    mockExecFileSuccess();

    await runHerdr(["pane", "list"]);
    expect(executedArgs()).toEqual(["--session", "tmp-b", "pane", "list"]);
  });

  // Herdr's read commands never start a server, so a Stopped session surfaces
  // as a refused socket connection. Views and the menu bar key their Stopped
  // state off this code and the session it names.
  it("reports a Stopped session when Herdr refuses the connection", async () => {
    storage.set("selectedSession", "tmp-b");
    mockExecFileFailure('Error: Os { code: 61, kind: ConnectionRefused, message: "Connection refused" }\n');

    const failure = await runHerdr(["api", "snapshot"]).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(HerdrError);
    expect(failure).toMatchObject({ code: "session_not_running", session: "tmp-b" });
    expect((failure as HerdrError).message).toContain("tmp-b");
  });

  // Herdr 0.9 answers a stopped session with its own JSON error envelope on
  // stderr instead of the raw refused-connection text older versions print.
  // Both shapes must read as a Stopped session, or the Stopped view is lost.
  it("reports a Stopped session from Herdr 0.9's server_not_running envelope", async () => {
    storage.set("selectedSession", "tmp-b");
    mockExecFileFailure(
      '{"id":"cli:api:snapshot","error":{"code":"server_not_running","message":"no herdr server is running at /x/tmp-b/herdr.sock; run `herdr session attach tmp-b` to start or attach it"}}\n',
    );

    const failure = await runHerdr(["api", "snapshot"]).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(HerdrError);
    expect(failure).toMatchObject({ code: "session_not_running", session: "tmp-b" });
  });

  // Commands that span sessions carry no session, so the same envelope is an
  // ordinary failure there rather than a Stopped session.
  it("does not call a sessionless command's server_not_running a Stopped session", async () => {
    mockExecFileFailure('{"id":"cli:session:stop","error":{"code":"server_not_running","message":"not running"}}\n');

    const failure = await runHerdr(["session", "stop", "tmp-b", "--json"], { session: "" }).catch(
      (error: unknown) => error,
    );
    expect(failure).toMatchObject({ code: "server_not_running" });
  });

  // A session that does not exist answers NotFound, not ConnectionRefused.
  // Calling that "stopped" offered to start it, and `herdr --session` creates
  // a session it cannot find, so a typo would silently make a new one.
  it("does not call a missing session stopped", async () => {
    storage.set("selectedSession", "typo");
    mockExecFileFailure('Error: Os { code: 2, kind: NotFound, message: "No such file or directory" }\n');

    const failure = await runHerdr(["api", "snapshot"]).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "command_failed" });
  });

  // Regression: the stopped check ran before the timeout check and looked at
  // stdout, so a slow `pane read` whose scrollback mentioned a refused
  // connection was reported as a stopped session.
  it("reports a timeout even when partial output mentions a refused connection", async () => {
    storage.set("selectedSession", "tmp-b");
    vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
      const callback = callArgs.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(Object.assign(new Error("timed out"), { killed: true }), "curl: (7) Connection refused\n", "");
      return {};
    }) as never);

    const failure = await runHerdr(["pane", "read", "w1:p1"]).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "timeout" });
  });
});

describe("getSnapshot", () => {
  it("reads the snapshot of an explicit session", async () => {
    storage.set("selectedSession", "tmp-b");
    vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
      const callback = callArgs.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, JSON.stringify({ result: { snapshot: { workspaces: [], tabs: [], panes: [], agents: [] } } }), "");
      return {};
    }) as never);

    await getSnapshot(undefined, "tmp-a");
    expect(executedArgs()).toEqual(["--session", "tmp-a", "api", "snapshot"]);
  });
});

describe("focusResource", () => {
  function mockCli(reply: (command: string) => string) {
    vi.mocked(execFile).mockImplementation(((...callArgs: unknown[]) => {
      const args = (callArgs[1] as string[]).slice(2);
      const callback = callArgs.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, reply(args.join(" ")), "");
      return {};
    }) as never);
  }

  function issuedCommands(): string[][] {
    return vi.mocked(execFile).mock.calls.map((call) => (call[1] as string[]).slice(2));
  }

  it("focuses a workspace with a single call", async () => {
    mockCli(() => "{}");

    await focusResource("workspace", "w1");
    expect(issuedCommands()).toEqual([["workspace", "focus", "w1"]]);
  });

  // Regression: `agent focus` moves the server's focus but leaves the attached
  // client drawing the tab it was already on, so the agent stayed off screen.
  it("switches to the agent's tab rather than only focusing the agent", async () => {
    mockCli((command) => {
      if (command.startsWith("agent focus")) {
        return JSON.stringify({ result: { agent: { pane_id: "w1:p2", tab_id: "w1:t1" } } });
      }
      if (command.startsWith("pane get")) {
        return JSON.stringify({ result: { pane: { pane_id: "w1:p2", tab_id: "w1:t1" } } });
      }
      if (command.startsWith("pane layout")) {
        return JSON.stringify({ result: { layout: { focused_pane_id: "w1:p2", panes: [{ pane_id: "w1:p2" }] } } });
      }
      return "{}";
    });

    await focusResource("agent", "billing-fix");

    expect(issuedCommands()).toEqual([
      ["agent", "focus", "billing-fix"],
      ["pane", "get", "w1:p2"],
      ["tab", "focus", "w1:t1"],
      ["pane", "layout", "--pane", "w1:p2"],
    ]);
  });
});
