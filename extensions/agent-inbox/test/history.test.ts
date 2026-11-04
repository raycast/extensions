import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { scanHistory } from "../src/core/history";
import { mergeSessions } from "../src/core/merge";
import { tempDir } from "./helpers";

const j = (o: unknown) => JSON.stringify(o);

test("scan Claude and Codex transcripts without importing them", (t) => {
  const root = tempDir(t);
  const claude = join(root, "claude");
  const codex = join(root, "codex");
  mkdirSync(join(claude, "-Users-me-fango-media"), { recursive: true });
  writeFileSync(
    join(claude, "-Users-me-fango-media", "11111111-aaaa-bbbb-cccc-000000000001.jsonl"),
    [
      j({
        type: "user",
        isMeta: true,
        message: { role: "user", content: "<command-name>/clear</command-name>" },
        cwd: "/Users/me/fango-media",
        sessionId: "11111111-aaaa-bbbb-cccc-000000000001",
        timestamp: "2026-11-03T06:02:00Z",
      }),
      j({
        type: "user",
        message: { role: "user", content: [{ type: "text", text: "写文章：Session manager 选题" }] },
        cwd: "/Users/me/fango-media",
        sessionId: "11111111-aaaa-bbbb-cccc-000000000001",
      }),
      j({ type: "assistant", message: { content: [{ type: "text", text: "初稿写完了。要不要挪到开头？" }] } }),
    ].join("\n"),
  );
  // empty session: ignored
  writeFileSync(
    join(claude, "-Users-me-fango-media", "empty.jsonl"),
    j({ type: "user", isMeta: true, message: { content: "<local-command-stdout></local-command-stdout>" } }),
  );

  const day = join(codex, "2026", "11", "03");
  mkdirSync(day, { recursive: true });
  const id = "0199a0c2-1111-2222-3333-444455556666";
  writeFileSync(
    join(day, `rollout-2026-11-03T14-10-00-${id}.jsonl`),
    [
      j({
        timestamp: "2026-11-03T06:10:00Z",
        type: "session_meta",
        payload: { id, cwd: "/Users/me/web-remakes", originator: "codex_cli_rs", timestamp: "2026-11-03T06:10:00Z" },
      }),
      j({
        type: "response_item",
        payload: { type: "message", role: "user", content: [{ type: "input_text", text: "<environment_context>…</environment_context>" }] },
      }),
      j({ type: "event_msg", payload: { type: "user_message", message: "web-remakes README 参数出处" } }),
      j({ type: "event_msg", payload: { type: "agent_message", message: "找到了三处出处。" } }),
    ].join("\n"),
  );
  const index = join(root, "session_index.jsonl");
  writeFileSync(index, j({ id, thread_name: "README 参数出处" }) + "\n");

  const entries = scanHistory({
    claudeRoot: claude,
    codexRoot: codex,
    codexIndex: index,
    claudeDesktopRoot: join(root, "desktop"),
    useCache: false,
  });
  assert.equal(entries.length, 2);
  const c = entries.find((e) => e.agent === "claude")!;
  assert.equal(c.title, "写文章：Session manager 选题");
  assert.equal(c.cwd, "/Users/me/fango-media");
  assert.equal(c.summary, "初稿写完了。要不要挪到开头？");
  assert.equal(c.host, "cli");
  const x = entries.find((e) => e.agent === "codex")!;
  assert.equal(x.sessionId, id);
  assert.equal(x.title, "README 参数出处");
  assert.equal(x.summary, "找到了三处出处。");

  // hook rows win, history fills gaps
  const merged = mergeSessions(
    [
      {
        ...x,
        title: "",
        summary: "",
        status: "running",
        attention: null,
        locator: {},
        subscribed: true,
        handledAt: null,
        updatedAt: x.updatedAt + 1,
      },
    ],
    entries,
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].status, "running");
  assert.equal(merged[0].title, "README 参数出处");
});
