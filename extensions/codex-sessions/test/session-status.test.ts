import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadSessionStates, markSessionSeen, sessionStatesPath } from "../src/lib/session-status";

const originalStateHome = process.env.XDG_STATE_HOME;
const originalStateDir = process.env.RAYCAST_CODEX_STATE_DIR;

let stateHome = "";

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "raycast-codex-session-status-"));
  stateHome = join(root, ".state");
  process.env.XDG_STATE_HOME = stateHome;
  delete process.env.RAYCAST_CODEX_STATE_DIR;
});

afterEach(() => {
  if (originalStateHome === undefined) delete process.env.XDG_STATE_HOME;
  else process.env.XDG_STATE_HOME = originalStateHome;
  if (originalStateDir === undefined) delete process.env.RAYCAST_CODEX_STATE_DIR;
  else process.env.RAYCAST_CODEX_STATE_DIR = originalStateDir;
});

const validState = {
  status: "done",
  unread: true,
  updatedAt: "2026-07-15T00:00:00Z",
  turnId: "t",
  cwd: "/tmp",
  source: "cli",
};

describe("session state library", () => {
  it("returns empty for missing or malformed states and ignores invalid entries", async () => {
    expect(await loadSessionStates()).toEqual({});
    await mkdir(join(stateHome, "raycast-codex-sessions"), { recursive: true });
    await writeFile(sessionStatesPath(), JSON.stringify({ good: validState, bad: { status: "done" }, scalar: "bad" }));
    expect(await loadSessionStates()).toEqual({ good: expect.any(Object) });
    await writeFile(sessionStatesPath(), "{bad");
    expect(await loadSessionStates()).toEqual({});
  });

  it("marks an existing session seen atomically and ignores missing sessions", async () => {
    await mkdir(join(stateHome, "raycast-codex-sessions"), { recursive: true });
    await writeFile(
      sessionStatesPath(),
      JSON.stringify({
        seen: validState,
        working: { ...validState, status: "working", unread: false },
      }),
    );
    await markSessionSeen("seen");
    await markSessionSeen("missing");
    expect((await loadSessionStates()).seen.unread).toBe(false);
    expect((await loadSessionStates()).working.unread).toBe(false);
  });

  it("prunes oversized state maps to the newest 500 sessions", async () => {
    await mkdir(join(stateHome, "raycast-codex-sessions"), { recursive: true });
    const states: Record<string, typeof validState> = {};
    for (let index = 0; index < 520; index += 1) {
      states[`session-${index}`] = {
        ...validState,
        updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      };
    }
    await writeFile(sessionStatesPath(), JSON.stringify(states));
    const loaded = await loadSessionStates();
    expect(Object.keys(loaded)).toHaveLength(500);
    expect(loaded["session-519"]).toBeDefined();
    expect(loaded["session-0"]).toBeUndefined();
  });
});
