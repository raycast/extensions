import { strict as assert } from "node:assert";
import { test } from "node:test";
import { join } from "node:path";
import { CLAUDE_BUNDLE, isClaudeCloudOnly } from "../src/core/claude-desktop";
import { sessionForForeground } from "../src/core/foreground";
import { Store } from "../src/core/db";
import { jumpClaude } from "../src/core/adapters/claude";
import { DEFAULT_CONFIG } from "../src/core/config";
import { absoluteTime, relativeTime, rowTime, statusLabel } from "../src/core/format";
import { translator } from "../src/core/messages";
import { tempDir } from "./helpers";

const noIO = {
  readClaudeDesktopSessions: () => [],
  readCodexDesktopSessions: async () => [],
  tmuxClients: async () => [],
};
const context = {
  bundleId: CLAUDE_BUNDLE,
  window: { title: "Cloud project - Claude Code", url: "https://claude.ai/epitaxy/session_cloud123" },
};

test("a new cloud-only Claude conversation can be subscribed by window identity without inventing local state", async (t) => {
  const focused = (await sessionForForeground(context, [], noIO))!;
  assert.ok(focused, "cloud windows must not require a local metadata record");
  assert.equal(focused.sessionId, "session_cloud123");
  assert.equal(focused.title, "Cloud project");
  assert.equal(focused.status, "unknown");
  assert.equal(focused.startedAt, 0);
  assert.equal(focused.updatedAt, 0);
  assert.equal(focused.cwd, "");
  assert.equal(focused.transcriptPath, "");
  assert.equal(isClaudeCloudOnly(focused), true);

  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.subscribeEntry(focused, { focused: true });
  const saved = (await store.get("claude", focused.sessionId))!;
  assert.equal(saved.subscribed, true);
  assert.equal(saved.status, "unknown");
  assert.deepEqual(await store.claimNotifications(), []);
  const repeated = (await sessionForForeground(
    { ...context, window: { ...context.window, url: "claude.ai/code/cse_cloud123" } },
    await store.all(),
    noIO,
  ))!;
  assert.equal(repeated.sessionId, saved.sessionId, "bridge prefix aliases reuse the saved subscription");
  assert.equal(repeated.subscribed, true);
  await store.subscribeEntry(repeated, { focused: true });
  assert.equal((await store.all()).length, 1);
});

test("cloud fallback requires a supported conversation URL and rejects conflicting document identities", async () => {
  for (const url of [
    "https://claude.ai/chat/session_cloud123",
    "https://claude.ai/settings",
    "https://example.com/epitaxy/session_cloud123",
    "https://claude.ai/epitaxy/session_",
    "https://claude.ai/epitaxy/session_cloud123/other",
    "https://claude.ai/epitaxy/local_missing",
    "http://claude.ai/epitaxy/session_cloud123",
    "https://user@claude.ai/epitaxy/session_cloud123",
    "",
  ]) {
    assert.equal(await sessionForForeground({ ...context, window: { ...context.window, url } }, [], noIO), undefined, url);
  }
  assert.equal(await sessionForForeground({ ...context, window: undefined }, [], noIO), undefined);
  assert.equal(
    await sessionForForeground(
      { ...context, window: { ...context.window, documentUrl: "https://claude.ai/epitaxy/session_another" } },
      [],
      noIO,
    ),
    undefined,
  );
});

test("cloud-only rows explain missing monitoring and unknown dates, while real events retain their status", async (t) => {
  const focused = (await sessionForForeground(context, [], noIO))!;
  const en = translator();
  assert.equal(statusLabel(focused, en), "Cloud status unavailable");
  assert.equal(absoluteTime(focused.startedAt, en), "—");
  assert.equal(relativeTime(focused.updatedAt, en), "—");
  assert.equal(rowTime({ ...focused, status: "running", updatedAt: 1000 }, en, 1000), en("time.justNow"));
  const store = new Store(join(tempDir(t), "db.sqlite"));
  await store.subscribeEntry(focused);
  await store.record({ agent: "claude", sessionId: focused.sessionId, type: "needs_input", requestIds: ["q"], at: 1000 });
  const live = (await sessionForForeground(context, await store.all(), noIO))!;
  assert.equal(live.status, "needs_input");
  assert.equal(isClaudeCloudOnly(live), false);
  assert.equal(statusLabel(live, en), "Waiting for You");
  assert.equal(live.updatedAt, 1000);
});

test("saved Claude cloud sessions jump through the cloud deep link rather than a local continue route", async () => {
  const focused = (await sessionForForeground(context, [], noIO))!;
  const urls: string[] = [];
  const result = await jumpClaude(focused, DEFAULT_CONFIG, {
    readClaudeDesktopSessions: () => [],
    openUrl: async (url) => {
      urls.push(url);
      return true;
    },
    activateBundle: async () => assert.fail("must use the known cloud route"),
    copyToClipboard: async () => assert.fail("must use the known cloud route"),
    jumpToCli: async () => assert.fail("must not resume a cloud ID in a local terminal"),
  });
  assert.deepEqual(result, { ok: true, method: "url" });
  assert.deepEqual(urls, ["claude://code/session_cloud123"]);
});

test("identifying an already-subscribed cloud window refreshes its name without changing its identity", async (t) => {
  const store = new Store(join(tempDir(t), "db.sqlite"));
  const original = (await sessionForForeground({ ...context, capturedAt: 100 }, [], noIO))!;
  await store.subscribeEntry(original, { focused: true });
  const renamed = (await sessionForForeground(
    { ...context, capturedAt: 200, window: { ...context.window, title: "Renamed - Claude Code" } },
    await store.all(),
    noIO,
  ))!;
  assert.equal(renamed.sessionId, original.sessionId);
  assert.equal(renamed.title, "Renamed");
  await store.subscribeEntry(renamed, { focused: true });
  const saved = (await store.get("claude", original.sessionId))!;
  assert.equal(saved.title, "Renamed");
  assert.equal(saved.updatedAt, 0);
  assert.equal(saved.status, "unknown");
  assert.equal((await store.all()).length, 1);
});
