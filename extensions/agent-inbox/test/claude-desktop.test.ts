import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { jumpClaude, parseClaudeHook } from "../src/core/adapters/claude";
import {
  CLAUDE_BUNDLE,
  ClaudeDesktopSession,
  enrichClaudeSessions,
  findClaudeDesktopSession,
  readClaudeDesktopSessions,
  sameClaudeBridgeId,
} from "../src/core/claude-desktop";
import { DEFAULT_CONFIG } from "../src/core/config";
import { scanHistory } from "../src/core/history";
import { fromHistory, mergeSessions } from "../src/core/merge";
import { applyEvent } from "../src/core/status";
import { Session } from "../src/core/types";
import { tempDir } from "./helpers";

const record: ClaudeDesktopSession = {
  sessionId: "local_11111111-1111-1111-1111-111111111111",
  cliSessionId: "22222222-2222-2222-2222-222222222222",
  title: "Desktop title",
  cwd: "/project",
  createdAt: 1,
  lastActivityAt: 2,
  lastFocusedAt: 3,
  isArchived: false,
};
const session: Session = {
  agent: "claude",
  sessionId: record.cliSessionId,
  host: "cli",
  title: "Old title",
  cwd: "",
  status: "done",
  attention: null,
  summary: "Done.",
  locator: {},
  subscribed: true,
  handledAt: 4,
  startedAt: 1,
  updatedAt: 2,
  transcriptPath: "",
};

test("desktop metadata supplies CLI-to-local IDs and ignores malformed records", (t) => {
  const root = tempDir(t);
  const dir = join(root, "account", "org");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, record.sessionId + ".json"), JSON.stringify({ ...record, secret: "not retained" }));
  writeFileSync(join(dir, "local_broken.json"), "{");
  writeFileSync(join(dir, "local_wrong.json"), JSON.stringify({ sessionId: "not-a-desktop-session" }));
  const records = readClaudeDesktopSessions(root);
  assert.deepEqual(records, [record]);
  assert.equal(findClaudeDesktopSession(record.cliSessionId, records)?.sessionId, record.sessionId);
  assert.equal(
    findClaudeDesktopSession(record.cliSessionId, [record, { ...record, sessionId: "local_duplicate" }]),
    undefined,
  );
  writeFileSync(
    join(dir, record.sessionId + ".json"),
    JSON.stringify({ ...record, title: "Renamed desktop conversation" }),
  );
  assert.equal(readClaudeDesktopSessions(root)[0].title, "Renamed desktop conversation");
});

test("desktop bridge aliases accept legacy string or arrays and reject unrelated values", (t) => {
  const root = tempDir(t);
  const file = join(root, record.sessionId + ".json");
  writeFileSync(file, JSON.stringify({ ...record, bridgeSessionIds: "session_cloud1" }));
  assert.deepEqual(readClaudeDesktopSessions(root)[0].bridgeSessionIds, ["session_cloud1"]);
  writeFileSync(
    file,
    JSON.stringify({
      ...record,
      bridgeSessionIds: ["session_cloud1", "session_cloud1", "cse_cloud2", "local_wrong", 1, "https://example.com"],
    }),
  );
  const records = readClaudeDesktopSessions(root);
  assert.deepEqual(records[0].bridgeSessionIds, ["session_cloud1", "cse_cloud2"]);
  assert.equal(findClaudeDesktopSession("cse_cloud1", records)?.sessionId, record.sessionId);
  assert.equal(findClaudeDesktopSession("session_cloud2", records)?.sessionId, record.sessionId);
  assert.equal(
    findClaudeDesktopSession("session_cloud1", [records[0], { ...records[0], sessionId: "local_ambiguous" }]),
    undefined,
  );
  assert.equal(sameClaudeBridgeId("cloud1", "session_cloud1"), false);
  assert.equal(sameClaudeBridgeId("local_cloud1", "session_cloud1"), false);
});

test("desktop mapping repairs a CLI guess without changing subscription or state", () => {
  const [resolved] = enrichClaudeSessions([session], [record]);
  assert.equal(resolved.host, "app");
  assert.equal(resolved.title, record.title);
  assert.equal(resolved.cwd, record.cwd);
  assert.equal(resolved.locator.claudeDesktopId, record.sessionId);
  assert.equal(resolved.subscribed, true);
  assert.equal(resolved.handledAt, 4);
  assert.equal(resolved.status, "done");
  assert.equal(session.host, "cli", "input is not mutated");
});

test("an explicit terminal resume takes priority over historical desktop ownership", () => {
  for (const locator of [{ tty: "/dev/ttys001", bundleId: "com.apple.Terminal" }, { claudeEntrypoint: "cli" }]) {
    const live = { ...session, status: "running" as const, locator };
    assert.deepEqual(enrichClaudeSessions([live], [record]), [live]);
  }
});

test("a legacy idle terminal locator from a failed desktop jump does not override desktop identity", () => {
  const stale = {
    ...session,
    status: "idle" as const,
    cwd: "/Users/me",
    locator: { tty: "/dev/ttys008", bundleId: "com.apple.Terminal" },
  };
  const [repaired] = enrichClaudeSessions([stale], [record]);
  assert.equal(repaired.host, "app");
  assert.equal(repaired.cwd, record.cwd);
  assert.equal(repaired.locator.claudeDesktopId, record.sessionId);
});

test("history recovers desktop sessions when a 350 KB message hides the entrypoint", (t) => {
  const root = tempDir(t);
  const claudeRoot = join(root, "projects");
  const project = join(claudeRoot, "-project");
  const desktop = join(root, "desktop", "account", "org");
  mkdirSync(project, { recursive: true });
  mkdirSync(desktop, { recursive: true });
  writeFileSync(join(desktop, record.sessionId + ".json"), JSON.stringify(record));
  writeFileSync(
    join(project, record.cliSessionId + ".jsonl"),
    [
      JSON.stringify({ type: "queue-operation" }),
      JSON.stringify({
        type: "user",
        sessionId: record.cliSessionId,
        entrypoint: "claude-desktop",
        message: { content: "x".repeat(350000) },
      }),
      JSON.stringify({ type: "custom-title", customTitle: "Transcript title" }),
    ].join("\n"),
  );
  const history = scanHistory({
    claudeRoot,
    claudeDesktopRoot: join(root, "desktop"),
    codexRoot: join(root, "no-codex"),
    codexIndex: "",
    useCache: false,
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].host, "app");
  assert.equal(history[0].title, record.title);
  assert.equal(history[0].cwd, record.cwd);
  assert.equal(fromHistory(history[0]).locator.claudeDesktopId, record.sessionId);
  assert.equal(mergeSessions([session], history)[0].locator.claudeDesktopId, record.sessionId);
});

test("desktop metadata without a transcript is still discoverable without writing a database", (t) => {
  const root = tempDir(t);
  writeFileSync(join(root, record.sessionId + ".json"), JSON.stringify(record));
  const history = scanHistory({
    claudeRoot: join(root, "absent"),
    claudeDesktopRoot: root,
    codexRoot: join(root, "no-codex"),
    codexIndex: "",
    useCache: false,
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].sessionId, record.cliSessionId);
  assert.equal(history[0].locator?.claudeDesktopId, record.sessionId);
  assert.equal(history[0].transcriptPath, "");
});

test("hook source uses explicit entrypoint and missing source never downgrades an existing desktop session", () => {
  const payload = { session_id: record.cliSessionId, hook_event_name: "UserPromptSubmit", prompt: "hi" };
  const cli = parseClaudeHook(payload, { CLAUDE_CODE_ENTRYPOINT: "cli", __CFBundleIdentifier: CLAUDE_BUNDLE })!;
  assert.equal(cli.host, "cli");
  assert.equal(cli.locator?.claudeEntrypoint, "cli");
  const unknown = parseClaudeHook(payload, {})!;
  assert.equal(unknown.host, undefined);
  assert.equal(applyEvent({ ...session, host: "app" }, unknown)!.next.host, "app");
});

test("Claude jump translates the CLI UUID to the desktop local ID", async () => {
  const urls: string[] = [];
  const result = await jumpClaude(session, DEFAULT_CONFIG, {
    readClaudeDesktopSessions: () => [record],
    openUrl: async (url) => {
      urls.push(url);
      return true;
    },
    activateBundle: async () => {
      assert.fail("should use a known deep link");
    },
    copyToClipboard: async () => {
      assert.fail("should use a known deep link");
    },
    jumpToCli: async () => {
      assert.fail("desktop sessions must not resume in a terminal");
    },
  });
  assert.deepEqual(result, { ok: true, method: "url" });
  assert.deepEqual(urls, [`claude://code/continue?session=${record.sessionId}`]);
});

test("an unmapped desktop UUID is copied for recovery instead of opening an invalid deep link", async () => {
  let copied = "";
  const result = await jumpClaude({ ...session, host: "app" }, DEFAULT_CONFIG, {
    readClaudeDesktopSessions: () => [],
    openUrl: async () => {
      assert.fail("a CLI UUID is invalid for code/continue");
    },
    activateBundle: async () => true,
    copyToClipboard: async (value) => {
      copied = value;
      return true;
    },
    jumpToCli: async () => {
      assert.fail("must not resume desktop sessions in a terminal");
    },
  });
  assert.deepEqual(result, { ok: true, method: "copied" });
  assert.equal(copied, record.cliSessionId);
});

test("a failed desktop launch is reported and an archived session is not sent to continue", async () => {
  const result = await jumpClaude(session, DEFAULT_CONFIG, {
    readClaudeDesktopSessions: () => [{ ...record, isArchived: true }],
    openUrl: async () => {
      assert.fail("continue excludes archived sessions");
    },
    activateBundle: async () => false,
    copyToClipboard: async () => true,
    jumpToCli: async () => {
      assert.fail("known desktop session");
    },
  });
  assert.equal(result.ok, false);
});
