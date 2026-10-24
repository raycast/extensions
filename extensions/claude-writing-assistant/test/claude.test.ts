import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import { IncompleteResponseError, RefusalError, runClaude, runClaudeJson } from "../src/lib/claude";

/**
 * A local stand-in for the Messages API that replays scripted SSE streams, so the client's
 * streaming, pause_turn, refusal and fallback handling run without spending tokens.
 */
type Block =
  | { type: "text"; text: string }
  | { type: "thinking" }
  | { type: "server_tool_use"; id: string; input: Record<string, unknown> }
  | Record<string, unknown>;

interface Recorded {
  headers: http.IncomingHttpHeaders;
  body: Record<string, unknown> & { messages: { role: string; content: unknown }[] };
}

let server: http.Server;
let script: string[] = [];
let requests: Recorded[] = [];

function sse(events: Record<string, unknown>[]): string {
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

function reply(
  blocks: Block[],
  stop: string,
  opts: { model?: string; stopDetails?: unknown; usage?: Record<string, unknown> } = {},
): string {
  const events: Record<string, unknown>[] = [
    {
      type: "message_start",
      message: {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: opts.model ?? "claude-opus-5-5",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 1000, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    },
  ];
  blocks.forEach((block, index) => {
    if (block.type === "text") {
      events.push({ type: "content_block_start", index, content_block: { type: "text", text: "", citations: null } });
      for (const chunk of (block.text as string).match(/.{1,4}/gs) ?? []) {
        events.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: chunk } });
      }
    } else if (block.type === "thinking") {
      events.push({
        type: "content_block_start",
        index,
        content_block: { type: "thinking", thinking: "", signature: "" },
      });
      events.push({ type: "content_block_delta", index, delta: { type: "signature_delta", signature: "sig" } });
    } else if (block.type === "server_tool_use") {
      events.push({
        type: "content_block_start",
        index,
        content_block: { type: "server_tool_use", id: block.id, name: "web_search", input: {} },
      });
      events.push({
        type: "content_block_delta",
        index,
        delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) },
      });
    } else {
      events.push({ type: "content_block_start", index, content_block: block });
    }
    events.push({ type: "content_block_stop", index });
  });
  events.push({
    type: "message_delta",
    delta: { stop_reason: stop, stop_sequence: null, stop_details: opts.stopDetails ?? null },
    usage: { output_tokens: 500, ...opts.usage },
  });
  events.push({ type: "message_stop" });
  return sse(events);
}

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      requests.push({ headers: req.headers, body: JSON.parse(raw) });
      const body = script.shift();
      if (!body) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "no script" } }));
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(() => {
  script = [];
  requests = [];
});

const base = { apiKey: "test-key", effort: "low" as const, messages: [{ role: "user" as const, content: "hi" }] };

describe("runClaude", () => {
  it("streams text and prices the reply", async () => {
    script.push(reply([{ type: "text", text: "Merhaba dünya" }], "end_turn"));
    const seen: string[] = [];
    const result = await runClaude({ ...base, model: "claude-opus-5-5", onText: (t) => seen.push(t) });
    assert.equal(result.text, "Merhaba dünya");
    assert.equal(seen.at(-1), "Merhaba dünya");
    assert.ok(seen.length > 1, "text arrives in several updates");
    assert.equal(result.usage.input, 1000);
    assert.equal(result.usage.output, 500);
    assert.ok(Math.abs(result.usage.cost - (1000 * 4 + 500 * 20) / 1e6) < 1e-12);
    assert.equal(result.truncated, false);
  });

  it("sends fallbacks and betas for Opus, nothing extra for Haiku", async () => {
    script.push(reply([{ type: "text", text: "a" }], "end_turn"), reply([{ type: "text", text: "b" }], "end_turn"));
    await runClaude({ ...base, model: "claude-opus-5-5", system: "sys" });
    await runClaude({ ...base, model: "claude-haiku-5-5" });
    const [opus, haiku] = requests;
    assert.equal(opus.body.fallbacks, "default");
    assert.match(String(opus.headers["anthropic-beta"]), /server-side-fallback-2026-07-01/);
    assert.deepEqual(opus.body.output_config, { effort: "low" });
    assert.equal(opus.body.system, "sys");
    assert.equal(opus.body.temperature, undefined);
    assert.equal(haiku.body.fallbacks, undefined);
    assert.equal(haiku.headers["anthropic-beta"], undefined);
    assert.equal(haiku.body.thinking, undefined);
  });

  it("turns on caching and the thinking safety net for conversations", async () => {
    script.push(reply([{ type: "text", text: "ok" }], "end_turn"));
    await runClaude({ ...base, model: "claude-sonnet-5-5", conversation: true, webSearch: true });
    const { body, headers } = requests[0];
    assert.deepEqual(body.cache_control, { type: "ephemeral" });
    assert.deepEqual(body.thinking, { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } });
    assert.match(String(headers["anthropic-beta"]), /thinking-binding-controls-2026-08-01/);
    const tools = body.tools as { type: string; name: string }[];
    assert.equal(tools[0].type, "web_search_20260209");
    assert.equal(tools[0].name, "web_search");
  });

  it("reports search activity, separates text around tool calls and lists sources", async () => {
    script.push(
      reply(
        [
          { type: "text", text: "Bakıyorum." },
          { type: "server_tool_use", id: "srv_1", input: { query: "node lts" } },
          {
            type: "web_search_tool_result",
            tool_use_id: "srv_1",
            content: [
              {
                type: "web_search_result",
                url: "https://nodejs.org/en",
                title: "Node.js",
                encrypted_content: "x",
                page_age: null,
              },
              {
                type: "web_search_result",
                url: "https://example.com/a",
                title: "",
                encrypted_content: "y",
                page_age: null,
              },
            ],
          },
          { type: "text", text: "Node 24 LTS." },
        ],
        "end_turn",
        { usage: { server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 } } },
      ),
    );
    const activity: (string | undefined)[] = [];
    const result = await runClaude({ ...base, model: "claude-opus-5-5", onActivity: (a) => activity.push(a) });
    assert.equal(result.text, "Bakıyorum.\n\nNode 24 LTS.");
    assert.deepEqual(activity.slice(0, 3), ["Searching the web…", "Searching for “node lts”…", "Reading results…"]);
    assert.equal(activity.at(-1), undefined);
    assert.deepEqual(result.sources, [
      { url: "https://nodejs.org/en", title: "Node.js" },
      { url: "https://example.com/a", title: "example.com" },
    ]);
    assert.equal(result.usage.webSearches, 1);
    assert.ok(result.usage.cost > 0.01);
  });

  it("resumes a paused turn by sending the paused content back", async () => {
    script.push(
      reply([{ type: "server_tool_use", id: "srv_1", input: { query: "q" } }], "pause_turn"),
      reply([{ type: "text", text: "Devamı" }], "end_turn"),
    );
    const result = await runClaude({ ...base, model: "claude-opus-5-5" });
    assert.equal(requests.length, 2);
    const second = requests[1].body.messages;
    assert.equal(second.length, 2);
    assert.equal(second[1].role, "assistant");
    assert.equal((second[1].content as { type: string }[])[0].type, "server_tool_use");
    assert.equal(result.text, "Devamı");
    assert.equal(result.assistantMessages.length, 2);
    assert.equal(result.usage.output, 1000);
  });

  it("raises a refusal with its category", async () => {
    script.push(reply([], "refusal", { stopDetails: { type: "refusal", category: "cyber", explanation: null } }));
    await assert.rejects(runClaude({ ...base, model: "claude-opus-5-5" }), (error: unknown) => {
      assert.ok(error instanceof RefusalError);
      assert.equal(error.category, "cyber");
      return true;
    });
  });

  it("keeps a mid-stream fallback's text continuous and drops the declined model's thinking", async () => {
    script.push(
      reply(
        [
          { type: "thinking" },
          { type: "text", text: "Yarım cümle " },
          { type: "fallback", from: { model: "claude-opus-5-5" }, to: { model: "claude-opus-5" } },
          { type: "text", text: "tamamlandı." },
        ],
        "end_turn",
        {
          model: "claude-opus-5",
          usage: {
            iterations: [
              {
                type: "message",
                model: null,
                input_tokens: 1000,
                output_tokens: 100,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0,
                cache_creation: null,
              },
              {
                type: "fallback_message",
                model: "claude-opus-5",
                input_tokens: 1000,
                output_tokens: 400,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0,
                cache_creation: null,
              },
            ],
          },
        },
      ),
    );
    const result = await runClaude({ ...base, model: "claude-opus-5-5" });
    assert.equal(result.text, "Yarım cümle tamamlandı.");
    assert.equal(result.usage.model, "claude-opus-5");
    const replayed = (result.assistantMessages[0].content as { type: string }[]).map((b) => b.type);
    assert.deepEqual(replayed, ["text", "fallback", "text"]);
    const expected = (1000 * 4 + 100 * 20 + 1000 * 5 + 400 * 25) / 1e6;
    assert.ok(Math.abs(result.usage.cost - expected) < 1e-12, `${result.usage.cost} vs ${expected}`);
  });

  it("parses structured output and flags a cut-off reply", async () => {
    script.push(reply([{ type: "text", text: '{"text":"düzeltildi"}' }], "end_turn"));
    const { data } = await runClaudeJson<{ text: string }>({
      ...base,
      model: "claude-haiku-5-5",
      schema: { type: "object" },
    });
    assert.equal(data.text, "düzeltildi");
    assert.deepEqual((requests[0].body.output_config as { format: unknown }).format, {
      type: "json_schema",
      schema: { type: "object" },
    });

    script.push(reply([{ type: "text", text: '{"text":"yar' }], "max_tokens"));
    await assert.rejects(
      runClaudeJson({ ...base, model: "claude-haiku-5-5", schema: { type: "object" } }),
      IncompleteResponseError,
    );
  });
});
