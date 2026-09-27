import { test } from "node:test";
import assert from "node:assert/strict";
import {
  claude,
  isLive,
  parseDesktopSession,
  parseLiveSession,
  statusOf,
  toAgents,
  waitingLabel,
  type LiveSession,
} from "../../src/lib/agents/sources/claude.ts";
import { fakePlatform } from "../fake-platform.ts";
import { proc } from "./helpers.ts";

const live = (extra: Partial<LiveSession> = {}): LiveSession => ({
  pid: 100,
  sessionId: "cli-1",
  cwd: "/Users/me/Projects/hopper",
  kind: "interactive",
  entrypoint: "cli",
  status: "idle",
  ...extra,
});

test("parses the live session file; ignores unreadable ones", () => {
  const text = JSON.stringify({
    pid: 7,
    sessionId: "s",
    cwd: "/p",
    procStart: "Sat Sep 26 18:42:14 2026",
    kind: "interactive",
    entrypoint: "claude-desktop",
    hostSessionId: "local_1",
    status: "waiting",
    waitingFor: "approve Bash: rm -rf dist",
    statusUpdatedAt: 5,
  });
  assert.deepEqual(parseLiveSession(text), {
    pid: 7,
    sessionId: "s",
    cwd: "/p",
    procStart: "Sat Sep 26 18:42:14 2026",
    kind: "interactive",
    entrypoint: "claude-desktop",
    hostSessionId: "local_1",
    name: undefined,
    status: "waiting",
    statusUpdatedAt: 5,
    waitingFor: "approve Bash: rm -rf dist",
  });
  assert.equal(parseLiveSession("{"), undefined);
  assert.equal(parseLiveSession(JSON.stringify({ pid: 1 })), undefined);
});

test("a session is live only while its process is the one that wrote it (pids are reused)", () => {
  const started = Date.parse("Sat Sep 26 18:42:14 2026 UTC");
  const session = live({ pid: 7, procStart: "Sat Sep 26 18:42:14 2026" });
  assert.equal(isLive(session, new Map([[7, { startedAt: started + 500 }]])), true);
  assert.equal(isLive(session, new Map([[7, { startedAt: started + 60_000 }]])), false);
  assert.equal(isLive(session, new Map()), false);
});

test("status: waiting is blocked (commands hidden), busy and shell working, post-turn questions stay idle", () => {
  assert.deepEqual(statusOf(live({ status: "waiting", waitingFor: "approve Bash: npm test" })), {
    status: "blocked",
    detail: "Approve Bash",
  });
  assert.deepEqual(statusOf(live({ status: "busy" })), { status: "working" });
  assert.deepEqual(statusOf(live({ status: "shell" })), { status: "working" });
  assert.deepEqual(statusOf(live(), { sessionId: "local_1", turnOutcome: "need_input" }), {
    status: "idle",
    detail: "Needs input",
  });
  assert.deepEqual(statusOf(live({ status: "odd" })), { status: "unknown" });
  assert.equal(waitingLabel("dialog open"), "Dialog open");
  assert.equal(waitingLabel(undefined), "Needs input");
});

test("desktop sessions open by deep link with the app's title; terminal ones are processes", () => {
  const agents = toAgents(
    [
      live({ pid: 1, sessionId: "cli-a", entrypoint: "claude-desktop", hostSessionId: "local_a" }),
      live({ pid: 2, sessionId: "cli-b" }),
    ],
    [
      parseDesktopSession(
        JSON.stringify({ sessionId: "local_a", cliSessionId: "cli-a", title: "Fix tabs", lastFocusedAt: 9 }),
      )!,
    ],
  );
  assert.deepEqual(
    agents.map((a) => [a.key, a.title, a.host, a.seenAt, a.placeKey]),
    [
      [
        "claude:cli-a",
        "Fix tabs",
        { kind: "link", bundleId: "com.anthropic.claudefordesktop", url: "claude://code/continue?session=local_a" },
        9,
        "com.anthropic.claudefordesktop:code:local_a",
      ],
      ["claude:cli-b", "hopper", { kind: "process", pid: 2, tty: "" }, undefined, undefined],
    ],
  );
  assert.equal(agents[1].resumeCommand, "cd /Users/me/Projects/hopper && claude --resume cli-b");
});

test("a forked side process of a desktop session doesn't show twice; SDK and daemon processes are hidden", () => {
  const agents = toAgents(
    [
      live({ pid: 1, sessionId: "fork", hostSessionId: "local_a", entrypoint: "claude-desktop" }),
      live({ pid: 2, sessionId: "main", hostSessionId: "local_a", entrypoint: "claude-desktop" }),
      live({ pid: 3, sessionId: "sdk", entrypoint: "sdk-ts" }),
      live({ pid: 4, sessionId: "d", kind: "daemon" }),
    ],
    [{ sessionId: "local_a", cliSessionId: "main" }],
  );
  assert.deepEqual(
    agents.map((a) => a.id),
    ["main"],
  );
});

test("list: reads both folders, keeps live sessions, and gives terminal sessions their tty", async () => {
  const platform = fakePlatform({
    readFiles: async (dir) =>
      dir.endsWith(".claude/sessions")
        ? [
            { path: "1.json", text: JSON.stringify({ pid: 1, sessionId: "a", cwd: "/p", status: "busy" }) },
            { path: "2.json", text: JSON.stringify({ pid: 2, sessionId: "gone", cwd: "/p", status: "idle" }) },
          ]
        : [],
  });
  const agents = await claude.list({ platform, apps: [], processes: [proc(1, 0, "ttys004", "claude")], now: 0 });
  assert.deepEqual(
    agents.map((a) => [a.id, a.status, a.host]),
    [["a", "working", { kind: "process", pid: 1, tty: "ttys004" }]],
  );
});
