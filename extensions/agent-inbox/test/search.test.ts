import { strict as assert } from "node:assert";
import { appendFileSync, mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, TestContext } from "node:test";
import { scanHistory } from "../src/core/history";
import { fromHistory } from "../src/core/merge";
import { searchSessions, SessionSearchIndex } from "../src/core/search";
import { conversationText } from "../src/core/transcript";
import { Session } from "../src/core/types";
import { readConfig, writeConfig } from "../src/core/config";
import { tempDir } from "./helpers";

function fixture(t: TestContext) {
  const root = tempDir(t);
  const claudeRoot = join(root, "claude");
  const codexRoot = join(root, "codex");
  mkdirSync(join(claudeRoot, "project"), { recursive: true });
  mkdirSync(codexRoot, { recursive: true });
  const options = { path: join(root, "search.sqlite"), claudeRoot, codexRoot };
  return { root, claudeRoot, codexRoot, options, index: new SessionSearchIndex(options) };
}

const message = (content: string) => JSON.stringify({ type: "assistant", message: { content } });
const session = (sessionId: string, title: string, transcriptPath = ""): Session => ({
  agent: "claude",
  sessionId,
  title,
  cwd: "/project",
  summary: "latest summary",
  transcriptPath,
  host: "cli",
  status: "idle",
  attention: null,
  locator: {},
  subscribed: false,
  handledAt: null,
  startedAt: 1,
  updatedAt: 1,
});

test("search reads full dialogue beyond head/tail and matches Chinese, Unicode and title/content terms", async (t) => {
  const { claudeRoot, index, options } = fixture(t);
  const path = join(claudeRoot, "project", "conversation.jsonl");
  writeFileSync(
    path,
    [
      JSON.stringify({ type: "user", sessionId: "conversation", message: { content: "Initial prompt" } }),
      JSON.stringify({ type: "tool", content: "x".repeat(150_000) }),
      message("中间独有内容：火星；恢复会话；ＡＢＣ case-insensitive。"),
      JSON.stringify({ type: "tool", content: "y".repeat(150_000) }),
      message("Last message"),
    ].join("\n"),
  );
  const sessions = [session("conversation", "Launch notebook", path)];
  const first = await index.update(sessions, () => undefined);
  assert.equal(first.updated, 1);
  for (const query of ["火", "火星", "恢复会话", "abc", "CASE-INSENSITIVE", "notebook 火星"]) {
    const hits = await index.search(query);
    assert.deepEqual(
      searchSessions(sessions, query, hits).map((s) => s.sessionId),
      ["conversation"],
      query,
    );
  }
  assert.equal(searchSessions(sessions, "不存在", await index.search("不存在")).length, 0);
  assert.equal(searchSessions(sessions, "Launch").length, 1, "titles work before content indexing completes");
  assert.equal(
    searchSessions(sessions, "latest summary").length,
    0,
    "metadata-only search does not silently search conversation bodies",
  );
  const warm = await new SessionSearchIndex(options).update(sessions, () => undefined);
  assert.equal(warm.updated, 0, "unchanged transcripts are not reread across command launches");
});

test("new and existing installations require an explicit opt-in to content search", (t) => {
  const path = join(tempDir(t), "config.json");
  assert.equal(readConfig(path).contentSearchEnabled, false);
  writeFileSync(path, JSON.stringify({ language: "zh", menuBarEnabled: true }));
  assert.equal(readConfig(path).contentSearchEnabled, false);
  writeConfig({ contentSearchEnabled: true }, path);
  assert.equal(readConfig(path).contentSearchEnabled, true);
  writeConfig({ contentSearchEnabled: false }, path);
  assert.equal(readConfig(path).contentSearchEnabled, false);
});

test("a transcript disappearing after discovery is reported without an uncaught stream error", async (t) => {
  const { claudeRoot, index } = fixture(t);
  const path = join(claudeRoot, "project", "removed-while-opening.jsonl");
  writeFileSync(path, message("content"));
  const result = await index.update([], ({ completed }) => {
    if (completed === 0) rmSync(path);
  });
  assert.equal(result.failed, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(await index.search("content"), {});
});

test("search index refreshes changed files and prunes removed sources, without stale results", async (t) => {
  const { claudeRoot, index } = fixture(t);
  const path = join(claudeRoot, "project", "quoted'file.jsonl");
  writeFileSync(path, message("before needle"));
  const sessions = [session("s", "Title", path)];
  await index.update(sessions, () => undefined);
  assert.ok((await index.search("before"))["claude:s"]);
  appendFileSync(path, "\n" + message("new 中文内容"));
  assert.equal((await index.update(sessions, () => undefined)).updated, 1);
  assert.ok((await index.search("中文内容"))["claude:s"]);
  const previous = statSync(path);
  writeFileSync(path, message("after replacement"));
  utimesSync(path, previous.atime, new Date(previous.mtimeMs + 1000));
  await index.update(sessions, () => undefined);
  assert.deepEqual(await index.search("before"), {});
  assert.ok((await index.search("replacement"))["claude:s"]);
  rmSync(path);
  await index.update(sessions, () => undefined);
  assert.deepEqual(await index.search("replacement"), {});
  assert.equal(searchSessions(sessions, "title").length, 1, "a missing transcript keeps metadata discoverable");
});

test("Codex messages are searchable, but reasoning, tool payloads and injected instructions are excluded", async (t) => {
  const { codexRoot, index } = fixture(t);
  const path = join(codexRoot, "rollout.jsonl");
  const entries = [
    { type: "session_meta", payload: { id: "codex-session" } },
    { type: "event_msg", payload: { type: "user_message", message: "请验证检索" } },
    {
      type: "response_item",
      payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "查询已完成" }] },
    },
    { type: "event_msg", payload: { type: "agent_message", message: "查询已完成" } },
    {
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "# AGENTS.md\nInjectedNeedle" }],
      },
    },
    { type: "response_item", payload: { type: "function_call_output", output: "ToolNeedle" } },
    {
      type: "response_item",
      payload: { type: "reasoning", summary: [{ type: "summary_text", text: "ReasoningNeedle" }] },
    },
  ];
  writeFileSync(path, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n{partial");
  await index.update([], () => undefined);
  for (const query of ["验证检索", "查询已完成"]) assert.ok((await index.search(query))["codex:codex-session"]);
  for (const query of ["InjectedNeedle", "ToolNeedle", "ReasoningNeedle"])
    assert.deepEqual(await index.search(query), {});
  assert.equal(conversationText("claude", { type: "user", isMeta: true, message: { content: "MetadataNeedle" } }), "");
  assert.equal(
    conversationText("claude", {
      type: "user",
      message: { content: [{ type: "tool_result", content: "ToolNeedle" }] },
    }),
    "",
  );
});

test("literal SQL/FTS punctuation is safe and terms can match separate transcript parts of one session", async (t) => {
  const { claudeRoot, index } = fixture(t);
  const sessions = [session("same-session", "Title")];
  for (const [name, text] of [
    ["part-a", `percent_% quote' double" OR union; --`],
    ["part-b", "second transcript fragment"],
  ]) {
    writeFileSync(
      join(claudeRoot, "project", name + ".jsonl"),
      JSON.stringify({ type: "assistant", sessionId: "same-session", message: { content: text } }),
    );
  }
  await index.update(sessions, () => undefined);
  for (const query of ["percent_%", "quote'", 'double"', "union;", "percent_% fragment"]) {
    assert.equal(searchSessions(sessions, query, await index.search(query)).length, 1, query);
  }
  assert.equal(searchSessions(sessions, "quote' missing", await index.search("quote' missing")).length, 0);
});

test("All Sessions discovery can include history older than the former 400-file cap", (t) => {
  const { claudeRoot, codexRoot, root } = fixture(t);
  for (let i = 0; i < 405; i++) {
    writeFileSync(
      join(claudeRoot, "project", `session-${i}.jsonl`),
      JSON.stringify({ type: "user", sessionId: `session-${i}`, message: { content: `Topic ${i}` } }),
    );
  }
  const entries = scanHistory({
    claudeRoot,
    codexRoot,
    claudeDesktopRoot: join(root, "none"),
    codexIndex: join(root, "none"),
    useCache: false,
    limit: Number.MAX_SAFE_INTEGER,
  });
  assert.equal(entries.length, 405);
  assert.equal(searchSessions(entries.map(fromHistory), "Topic 404").length, 1);
});

test("full-content hits stay discoverable when all dialogue lies outside history sampling windows", async (t) => {
  const { claudeRoot, codexRoot, root, index } = fixture(t);
  const path = join(claudeRoot, "project", "hidden-dialogue.jsonl");
  writeFileSync(
    path,
    [
      JSON.stringify({ type: "tool", sessionId: "hidden-dialogue", content: "x".repeat(150_000) }),
      JSON.stringify({ type: "user", sessionId: "hidden-dialogue", message: { content: "中间的真实用户提问" } }),
      JSON.stringify({ type: "tool", content: "y".repeat(150_000) }),
    ].join("\n"),
  );
  const opts = {
    claudeRoot,
    codexRoot,
    claudeDesktopRoot: join(root, "none"),
    codexIndex: join(root, "none"),
    useCache: false,
  };
  assert.equal(scanHistory(opts).length, 0, "ordinary history retains its empty-session behavior");
  const sessions = scanHistory({ ...opts, includeUntitled: true }).map(fromHistory);
  assert.equal(sessions.length, 1);
  await index.update(sessions, () => undefined);
  assert.equal(searchSessions(sessions, "真实用户", await index.search("真实用户")).length, 1);
});

test("cancelling a full index does not leave unreadable partial writes or block a later refresh", async (t) => {
  const { claudeRoot, index } = fixture(t);
  const path = join(claudeRoot, "project", "cancel.jsonl");
  writeFileSync(path, Array.from({ length: 10000 }, () => message("Long message " + "x".repeat(300))).join("\n"));
  const controller = new AbortController();
  const updating = index.update([], () => controller.abort(), controller.signal);
  await assert.rejects(updating, { name: "AbortError" });
  const result = await index.update([], () => undefined);
  assert.equal(result.failed, 0);
  assert.ok((await index.search("long message"))["claude:cancel"]);
});

test("cancelling an in-flight transcript stream is contained during navigation and rapid refresh", async (t) => {
  const { claudeRoot, index } = fixture(t);
  const path = join(claudeRoot, "project", "in-flight.jsonl");
  writeFileSync(path, (message("Searchable dialogue " + "x".repeat(500)) + "\n").repeat(40000));
  for (const delay of [1, 5, 10]) {
    const controller = new AbortController();
    let cancel: ReturnType<typeof setTimeout> | undefined;
    const updating = index.update(
      [],
      ({ completed }) => {
        if (completed === 0) cancel = setTimeout(() => controller.abort(), delay);
      },
      controller.signal,
    );
    await assert.rejects(updating, { name: "AbortError" });
    clearTimeout(cancel);
    // Stream destruction emits errors asynchronously, after the iterator's cleanup runs.
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  const result = await index.update([], () => undefined);
  assert.equal(result.failed, 0);
  assert.ok((await index.search("searchable dialogue"))["claude:in-flight"]);
});
