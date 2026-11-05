import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../src/core/db";
import { captureLocator, terminalOwnerAlive } from "../src/core/locate";
import { EventEngine } from "../src/core/engine";
import { DEFAULT_CONFIG } from "../src/core/config";
import { TranscriptCollector, TranscriptCursor } from "../src/core/sources/collector";
import { codexAdapter } from "../src/core/adapters/codex";
import { IndexQueue } from "../src/core/index-queue";
import { IndexProgress } from "../src/core/search";
import { macosChannel } from "../src/core/notifications/macos";
import { osascript } from "../src/core/exec";
import { Session } from "../src/core/types";
import { jumpToCli } from "../src/core/jump";
import { tempDir } from "./helpers";

const locator = {
  tty: "/dev/ttys001",
  pid: 123,
  processStartedAt: "Wed Nov 4 12:00:00 2026",
  bundleId: "com.apple.Terminal",
};

test("terminal ownership transfers between sessions, rejects late claims and clears on exit", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.record({ agent: "claude", sessionId: "old", type: "started", locator, at: 100 });
  await store.setSubscribed("claude", "old", true);
  await store.record({ agent: "claude", sessionId: "new", type: "started", locator, at: 300 });
  assert.equal((await store.get("claude", "old"))!.locator.tty, undefined);
  assert.equal((await store.get("claude", "old"))!.subscribed, true);
  await store.record({
    agent: "claude",
    sessionId: "old",
    type: "needs_input",
    requestIds: ["late"],
    locator,
    at: 200,
  });
  assert.equal(
    (await store.get("claude", "old"))!.locator.tty,
    undefined,
    "late events must not reclaim a reused terminal",
  );
  assert.equal((await store.get("claude", "new"))!.locator.tty, locator.tty);
  await store.record({ agent: "claude", sessionId: "new", type: "ended", locator, at: 400 });
  assert.equal((await store.get("claude", "new"))!.locator.tty, undefined);
  assert.equal((await store.get("claude", "new"))!.locator.pid, undefined);
});

test("tmux pane ownership includes the server socket", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  const first = { ...locator, tmuxPane: "%1", tmuxSocket: "/tmp/server-a" };
  const second = { ...locator, tty: "/dev/ttys002", tmuxPane: "%1", tmuxSocket: "/tmp/server-b" };
  await store.record({ agent: "claude", sessionId: "a", type: "started", locator: first, at: 100 });
  await store.record({ agent: "codex", sessionId: "b", type: "started", locator: second, at: 200 });
  await store.record({ agent: "codex", sessionId: "c", type: "started", locator: first, at: 300 });
  assert.equal((await store.get("claude", "a"))!.locator.tmuxPane, undefined);
  assert.equal((await store.get("codex", "b"))!.locator.tmuxSocket, second.tmuxSocket);
});

test("terminal liveness verifies the recorded PID, start time, tty and agent executable", async () => {
  const ps = (text: string) => async () => ({ ok: true, stdout: text, stderr: "" });
  assert.equal(await terminalOwnerAlive(locator, ps("1 ttys001 Wed Nov 4 12:00:00 2026 /usr/local/bin/claude")), true);
  assert.equal(await terminalOwnerAlive(locator, ps("1 ttys001 Wed Nov 4 12:01:00 2026 /usr/local/bin/claude")), false);
  assert.equal(await terminalOwnerAlive(locator, ps("1 ttys002 Wed Nov 4 12:00:00 2026 /usr/local/bin/claude")), false);
  assert.equal(
    await terminalOwnerAlive(locator, ps("1 ttys001 Wed Nov 4 12:00:00 2026 /usr/local/bin/node server.js")),
    false,
  );
  assert.equal(await terminalOwnerAlive({ tty: locator.tty }, ps("")), false);
  const captured = await captureLocator({}, 456, async (_file, args) => ({
    ok: true,
    stderr: "",
    stdout:
      args[0] === "-o"
        ? "ttys001"
        : args[2] === "456"
          ? "123 ttys001 Wed Nov 4 12:01:00 2026 /bin/sh -c hook"
          : "1 ttys001 Wed Nov 4 12:00:00 2026 /usr/local/bin/claude",
  }));
  assert.deepEqual(captured, { tty: locator.tty, pid: 123, processStartedAt: locator.processStartedAt });
});

test("cached session locators cannot jump into a terminal that has been reassigned", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.record({ agent: "claude", sessionId: "old", type: "started", locator, at: 100 });
  const cached = (await store.get("claude", "old"))!;
  await store.record({ agent: "claude", sessionId: "new", type: "started", locator, at: 200 });
  const result = await jumpToCli(cached, "claude --resume old", DEFAULT_CONFIG, {
    currentSession: (s) => store.get(s.agent, s.sessionId),
    terminalOwnerAlive: async (loc) => !!loc.pid,
    tmuxPaneAlive: async () => true,
    focusTmuxPane: async () => assert.fail("must not focus a reused pane"),
    focusTty: async () => assert.fail("must not focus a reused tab"),
    activateBundle: async () => assert.fail("must not activate a reused terminal"),
    bundleFor: () => "com.apple.Terminal",
    openInTerminal: async () => true,
  });
  assert.deepEqual(result, { ok: true, method: "resume" });
});

const record = (at: number, payload: object) =>
  JSON.stringify({ timestamp: new Date(at).toISOString(), type: "response_item", payload }) + "\n";
const question = (at: number, id: string) =>
  record(at, {
    type: "function_call",
    name: "request_user_input_async",
    call_id: id,
    arguments: '{"questions":[{"title":"Choose"}]}',
  });

test("questions appended during multi-batch recovery notify once while historical requests stay silent", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "rollout.jsonl");
  writeFileSync(
    path,
    question(100, "old") + record(200, { type: "custom_tool_call_output", output: "x".repeat(2 * 1024 * 1024) }),
  );
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "codex", sessionId: "s", type: "started", transcriptPath: path, at: 1 });
  await store.setSubscribed("codex", "s", true);
  const save = store.writeCursor.bind(store);
  let appended = false;
  store.writeCursor = async (key, value) => {
    await save(key, value);
    if (!appended && (value as TranscriptCursor).bootstrapping) {
      appended = true;
      appendFileSync(path, question(300, "new"));
    }
  };
  const collector = new TranscriptCollector(
    new EventEngine(store, () => DEFAULT_CONFIG),
    () => [codexAdapter],
    assert.fail,
  );
  await collector.poll();
  assert.equal(appended, true);
  const jobs = await store.claimNotifications();
  assert.equal(jobs.length, 1);
  const pending = (JSON.parse(jobs[0].payload) as Session).state!.pending.map((item) => item.id);
  assert.deepEqual(pending, ["old:0", "new:0"]);
  await store.finishNotification(jobs[0], true);
  await collector.poll();
  assert.deepEqual(await store.claimNotifications(), []);
});

test("a question completed after an initially partial record remains a live event", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "rollout.jsonl");
  const line = question(200, "new");
  writeFileSync(path, line.slice(0, 30));
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "codex", sessionId: "s", type: "started", transcriptPath: path, at: 1 });
  await store.setSubscribed("codex", "s", true);
  const collector = new TranscriptCollector(
    new EventEngine(store, () => DEFAULT_CONFIG),
    () => [codexAdapter],
    assert.fail,
  );
  await collector.poll();
  appendFileSync(path, line.slice(30));
  await collector.poll();
  assert.equal((await store.claimNotifications()).length, 1);
});

const progress: IndexProgress = { completed: 1, total: 1, updated: 1, failed: 0 };
test("list refreshes coalesce and do not abort a slow active index run", async () => {
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const calls: Session[][] = [],
    signals: AbortSignal[] = [];
  const first: Session[] = [],
    intermediate = [{} as Session],
    latest = [{ sessionId: "latest" } as Session];
  let completed = 0;
  const worker = new IndexQueue(
    {
      update: async (sessions, _progress, signal) => {
        calls.push(sessions);
        signals.push(signal!);
        if (calls.length === 1) await blocked;
        signal!.throwIfAborted();
        return progress;
      },
    },
    {
      busy: () => {},
      progress: () => {},
      completed: () => {
        completed++;
      },
      failed: () => assert.fail("unexpected indexing error"),
    },
  );
  const done = worker.update(first);
  void worker.update(intermediate);
  void worker.update(latest);
  assert.equal(signals[0].aborted, false);
  finish();
  await done;
  assert.deepEqual(calls, [first, latest]);
  assert.equal(completed, 2);
  worker.dispose();
  assert.equal(signals[0].aborted, true);
  await worker.update(first);
  assert.equal(calls.length, 2);
});

test("leaving the view cancels active indexing and suppresses later UI updates", async () => {
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let signal: AbortSignal | undefined,
    completed = 0;
  const worker = new IndexQueue(
    {
      update: async (_sessions, _progress, value) => {
        signal = value;
        await blocked;
        return progress;
      },
    },
    {
      busy: () => {},
      progress: () => {
        completed++;
      },
      completed: () => {
        completed++;
      },
      failed: () => {
        completed++;
      },
    },
  );
  const done = worker.update([]);
  worker.dispose();
  finish();
  await done;
  assert.equal(signal!.aborted, true);
  assert.equal(completed, 0);
});

test("notification AppleScript keeps quotes, newlines and script-like text in argv", async () => {
  const payload = 'quote " \\ newline\n do shell script "unexpected"';
  let args: string[] = [];
  await macosChannel(undefined, {
    terminalNotifierPath: () => undefined,
    run: async (_file, values) => {
      args = values;
      return { ok: true, stdout: "", stderr: "" };
    },
  }).send(
    { id: "n", at: 1, agent: "claude", sessionId: "s", title: payload, summary: payload, attention: "question" },
    { config: DEFAULT_CONFIG, signal: new AbortController().signal },
  );
  assert.ok(!args[1].includes(payload));
  assert.deepEqual(args.slice(2), ["--", payload, "Asked you a question", payload]);
  const echoed = await osascript("on run argv\nreturn item 1 of argv\nend run", "AppleScript", [payload]);
  assert.equal(echoed.ok, true, echoed.stderr);
  assert.equal(echoed.stdout.trimEnd(), payload);
});

test("recovery resets its boundary when a file is truncated before the old end", async (t) => {
  const directory = tempDir(t),
    path = join(directory, "rollout.jsonl");
  writeFileSync(
    path,
    question(100, "old") + record(200, { type: "custom_tool_call_output", output: "x".repeat(3 * 1024 * 1024) }),
  );
  const store = new Store(join(directory, "db.sqlite"));
  await store.record({ agent: "codex", sessionId: "s", type: "started", transcriptPath: path, at: 1 });
  await store.setSubscribed("codex", "s", true);
  const save = store.writeCursor.bind(store);
  let truncated = false;
  store.writeCursor = async (key, value) => {
    await save(key, value);
    if (!truncated && (value as TranscriptCursor).bootstrapping) {
      truncated = true;
      writeFileSync(
        path,
        question(300, "replacement") +
          record(400, { type: "custom_tool_call_output", output: "x".repeat(2 * 1024 * 1024) }),
      );
    }
  };
  const collector = new TranscriptCollector(
    new EventEngine(store, () => DEFAULT_CONFIG),
    () => [codexAdapter],
    assert.fail,
  );
  await collector.poll();
  assert.equal(truncated, true);
  assert.deepEqual(
    (await store.get("codex", "s"))!.state!.pending.map((item) => item.id),
    ["replacement:0"],
  );
  assert.deepEqual(await store.claimNotifications(), []);
  appendFileSync(path, question(500, "live"));
  await collector.poll();
  assert.equal((await store.claimNotifications()).length, 1);
});
