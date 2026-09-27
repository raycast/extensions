import { test } from "node:test";
import assert from "node:assert/strict";
import { toAgents as cliAgents } from "../../src/lib/agents/sources/cli.ts";
import { codex, statusOf as codexStatus, terminalFor, threadsDb } from "../../src/lib/agents/sources/codex.ts";
import {
  cursor,
  parseHeaders,
  transcriptPath,
  turnOpen,
  statusOf as cursorStatus,
  toAgents as cursorAgents,
} from "../../src/lib/agents/sources/cursor.ts";
import { fromSnapshot, herdr } from "../../src/lib/agents/sources/herdr.ts";
import { snapshotOf } from "../../src/lib/tabs/sources/herdr.ts";
import type { Tab } from "../../src/lib/tabs/model.ts";
import { fakePlatform } from "../fake-platform.ts";
import { proc } from "./helpers.ts";

test("cli: known agent CLIs with a terminal, outermost process only", () => {
  const agents = cliAgents([
    proc(1, 0, "ttys001", "codex", { cwd: "/p" }),
    proc(2, 1, "ttys001", "codex"), // its helper
    proc(3, 0, "", "codex"), // no terminal
    proc(4, 0, "ttys002", "vim"),
    proc(5, 0, "ttys003", "gemini"),
  ]);
  assert.deepEqual(
    agents.map((a) => [a.product, a.cwd, a.host]),
    [
      ["Codex", "/p", { kind: "process", pid: 1, tty: "ttys001" }],
      ["Gemini CLI", undefined, { kind: "process", pid: 5, tty: "ttys003" }],
    ],
  );
});

test("cursor: blocked, working, done from Cursor's own flags; old idle and archived agents left out", () => {
  const headers = parseHeaders([
    { id: "a", name: "Refactor", unread: 0, blocking: 1, updatedAt: 2 * 24 * 60 * 60 * 1000 - 10, folder: "/p/app" },
    { id: "b", unread: 0, blocking: 0, updatedAt: 2 * 24 * 60 * 60 * 1000 - 10, folder: "/p/app" },
    { id: "c", unread: 1, blocking: 0, updatedAt: 2 * 24 * 60 * 60 * 1000 - 10, folder: "/p/app" },
    { id: "d", unread: 0, blocking: 0, updatedAt: 1, folder: "/p/app" },
    { id: "e", archived: 1, folder: "/p/app" },
    { id: "f", draft: 1 },
  ]);
  assert.equal(cursorStatus(headers[1], "generating"), "working");
  const agents = cursorAgents(headers, new Map([["b", "generating"]]), 2 * 24 * 60 * 60 * 1000);
  assert.deepEqual(
    agents.map((a) => [a.id, a.title, a.status]),
    [
      ["a", "Refactor", "blocked"],
      ["b", "Cursor agent", "working"],
      ["c", "Cursor agent", "done"],
    ],
  );
  assert.deepEqual(agents[0].host, {
    kind: "link",
    bundleId: "com.todesktop.230313mzl4w4u92",
    url: "cursor://anysphere.cursor-deeplink/agent?id=a",
    label: "Cursor › app",
  });
});

test("cursor: headers from the composerHeaders table, the old blob when Cursor has no table", async () => {
  const header = { id: "a", unread: 1, blocking: 0, updatedAt: 5, folder: "/p/app" };
  const run = async (hasTable: boolean) => {
    const queries: string[] = [];
    const platform = fakePlatform({
      querySqlite: async (_db, sql) => {
        queries.push(sql);
        if (sql.includes("from composerHeaders")) {
          if (!hasTable) throw new Error("no such table: composerHeaders");
          return [header];
        }
        if (sql.includes("allComposers")) return [header];
        return [];
      },
    });
    const agents = await cursor.list({
      platform,
      apps: [{ name: "Cursor", bundleId: "com.todesktop.230313mzl4w4u92", path: "/Applications/Cursor.app" }],
      now: 10,
    } as never);
    return { ids: agents.map((a) => a.id), legacy: queries.some((q) => q.includes("allComposers")) };
  };
  assert.deepEqual(await run(true), { ids: ["a"], legacy: false });
  assert.deepEqual(await run(false), { ids: ["a"], legacy: true });
});

test("cursor: an agent saved as aborted is working while its transcript's turn is open", async () => {
  assert.equal(
    transcriptPath("/h", "/Users/me/my_app.v2", "x"),
    "/h/.cursor/projects/Users-me-my-app-v2/agent-transcripts/x/x.jsonl",
  );
  assert.equal(turnOpen('{"role":"user"}\n'), true);
  assert.equal(turnOpen('{"role":"user"}\n{"type":"turn_ended","status":"success"}\n'), false);
  assert.equal(turnOpen(""), false);
  const header = { id: "a", unread: 0, blocking: 0, updatedAt: 5, folder: "/p/app" };
  const statusFor = async (tail: string) => {
    const platform = fakePlatform({
      querySqlite: async (_db, sql) =>
        sql.includes("from composerHeaders") ? [header] : [{ id: "a", status: "aborted" }],
      readTail: async () => tail,
    });
    const apps = [{ name: "Cursor", bundleId: "com.todesktop.230313mzl4w4u92", path: "/Applications/Cursor.app" }];
    return (await cursor.list({ platform, apps, now: 10 } as never))[0]?.status;
  };
  assert.equal(await statusFor('{"role":"user"}'), "working");
  assert.equal(await statusFor('{"type":"turn_ended","status":"success"}'), "idle");
});

const snapshot = {
  id: "hopper",
  result: {
    type: "session_snapshot",
    snapshot: {
      workspaces: [{ workspace_id: "w1", label: "api" }],
      tabs: [{ tab_id: "w1:t1", label: "agents" }],
      agents: [
        {
          pane_id: "w1:p1",
          workspace_id: "w1",
          tab_id: "w1:t1",
          agent: "claude",
          agent_status: "blocked",
          agent_session: { source: "hook", agent: "claude", kind: "id", value: "s1" },
          foreground_cwd: "/p/api",
        },
        { pane_id: "w1:p2", workspace_id: "w1", tab_id: "w1:t1", agent: "pi", agent_status: "weird" },
      ],
    },
  },
};

test("herdr: agents from a snapshot, with the session they run and their pane", () => {
  const agents = fromSnapshot(snapshotOf(snapshot)!, "/s");
  assert.deepEqual(
    agents.map((a) => [a.product, a.id, a.status, a.cwd, a.sessionIds, a.host]),
    [
      [
        "Claude",
        "s1",
        "blocked",
        "/p/api",
        ["s1"],
        { kind: "herdr", socket: "/s", paneId: "w1:p1", label: "herdr › api › agents" },
      ],
      [
        "Pi",
        "w1:p2",
        "unknown",
        undefined,
        undefined,
        { kind: "herdr", socket: "/s", paneId: "w1:p2", label: "herdr › api › agents" },
      ],
    ],
  );
  assert.equal(snapshotOf({ error: { code: "x" } }), undefined);
});

test("herdr: asks every session's socket; one that doesn't answer is skipped", async () => {
  const asked: string[] = [];
  const platform = fakePlatform({
    listDir: async (dir) =>
      dir.endsWith("/sessions") ? ["work"] : dir.endsWith("/work") ? ["herdr.sock"] : ["herdr.sock", "config.toml"],
    socketRequest: async (path) => {
      asked.push(path);
      if (path.includes("work")) throw new Error("ECONNREFUSED");
      return snapshot;
    },
  });
  const agents = await herdr.list({ platform, apps: [], processes: [], now: 0 });
  assert.deepEqual(asked, ["/Users/me/.config/herdr/herdr.sock", "/Users/me/.config/herdr/sessions/work/herdr.sock"]);
  assert.equal(agents.length, 2);
});

const event = (type: string) => JSON.stringify({ type: "event_msg", payload: { type } });

test("codex: working while the rollout's last turn has started and not ended", () => {
  const tail = [event("task_started"), JSON.stringify({ type: "response_item", payload: { type: "message" } })];
  assert.equal(codexStatus(tail.join("\n")), "working");
  assert.equal(codexStatus([...tail, event("task_complete")].join("\n")), "idle");
  assert.equal(codexStatus([event("turn_started"), event("turn_aborted")].join("\n")), "idle");
  assert.equal(codexStatus('{"partial'), "idle");
});

test("codex: a terminal thread's host is the one Codex process working in its folder", () => {
  const processes = [proc(1, 0, "ttys001", "codex", { cwd: "/a" }), proc(2, 0, "ttys002", "codex", { cwd: "/b" })];
  assert.equal(terminalFor("/a", processes)?.pid, 1);
  assert.equal(terminalFor("/a", [...processes, proc(3, 0, "ttys003", "codex", { cwd: "/a" })]), undefined);
});

test("codex: app threads open by link while the app runs; CLI threads need their terminal", async () => {
  const queries: string[] = [];
  const platform = fakePlatform({
    listDir: async () => ["state_5.sqlite"],
    querySqlite: async (_path, sql) => {
      queries.push(sql);
      return [
        { id: "t1", source: "vscode", cwd: "/a", title: "Review\nmore", updatedAt: 5, rollout: "/r1" },
        { id: "t2", source: "cli", cwd: "/a", title: null, updatedAt: 4, rollout: "/r2" },
        { id: "t3", source: "cli", cwd: "/gone", title: "old", updatedAt: 3, rollout: "/r3" },
      ];
    },
    readTail: async (path) => (path === "/r1" ? event("task_started") : event("task_complete")),
  });
  const codexApp = { bundleId: "com.openai.codex", name: "ChatGPT", path: "/Applications/ChatGPT.app" };
  const agents = await codex.list({
    platform,
    apps: [codexApp],
    processes: [proc(7, 0, "ttys001", "codex", { cwd: "/a" })],
    now: 100_000_000,
  });
  assert.match(queries[0], /archived = 0 and source in \('cli', 'vscode', 'appServer'\)/);
  assert.deepEqual(
    agents.map((a) => [a.title, a.status, a.host, a.resumeCommand]),
    [
      [
        "Review",
        "working",
        { kind: "link", bundleId: "com.openai.codex", url: "codex://threads/t1" },
        "codex resume t1",
      ],
      ["Codex", "idle", { kind: "process", pid: 7, tty: "ttys001" }, "codex resume t2"],
    ],
  );
  // Neither the app nor a Codex CLI running: nothing read.
  assert.deepEqual(await codex.list({ platform, apps: [], processes: [], now: 0 }), []);
  assert.equal(queries.length, 1);
});

test("codex: the thread database is the highest-numbered state file", () => {
  assert.equal(
    threadsDb(["logs_2.sqlite", "state_5.sqlite", "state_5.sqlite-wal", "state_12.sqlite"]),
    "state_12.sqlite",
  );
  assert.equal(threadsDb(["state.sqlite", "logs_2.sqlite"]), undefined);
});

test("codex: falls back to the original columns when the schema changed, and to nothing after that", async () => {
  const paths: string[] = [];
  const queries: string[] = [];
  let failures = 1;
  const platform = fakePlatform({
    listDir: async () => ["state_5.sqlite", "state_6.sqlite"],
    querySqlite: async (path, sql) => {
      paths.push(path);
      queries.push(sql);
      if (failures-- > 0) throw new Error("no such column: updated_at_ms");
      return [{ id: "t1", source: "vscode", cwd: "/a", title: "T", updatedAt: 5000, rollout: "/r1" }];
    },
    readTail: async () => "",
  });
  const context = {
    platform,
    apps: [{ bundleId: "com.openai.codex", name: "ChatGPT", path: "/x" }],
    processes: [],
    now: 0,
  };
  assert.deepEqual(
    (await codex.list(context)).map((a) => a.id),
    ["t1"],
  );
  assert.equal(paths[0], "/Users/me/.codex/state_6.sqlite");
  assert.match(queries[1], /updated_at \* 1000/);
  failures = 2;
  assert.deepEqual(await codex.list(context), []);
});
