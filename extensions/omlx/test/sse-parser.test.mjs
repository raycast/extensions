// Regression tests for the SSE parser behind streamCompletion.
// Run with: npm test (uses the existing TypeScript dev dependency).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/sse-parser.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { createSseParser } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

const enc = new TextEncoder();

/** Encode one SSE data event (with trailing blank line) as bytes. */
function sseEvent(obj) {
  return enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

const DONE = enc.encode("data: [DONE]\n\n");

function deltaEvent(fields) {
  return sseEvent({ choices: [{ delta: fields }] });
}

function textDelta(text) {
  return deltaEvent({ content: text });
}

function reasoningDelta(text) {
  return deltaEvent({ reasoning_content: text });
}

function toolCallDelta(index, id, name, args) {
  return sseEvent({
    choices: [
      {
        delta: {
          tool_calls: [
            {
              index,
              ...(id ? { id } : {}),
              function: { ...(name ? { name } : {}), arguments: args },
            },
          ],
        },
      },
    ],
  });
}

function finishEvent(reason) {
  return sseEvent({ choices: [{ delta: {}, finish_reason: reason }] });
}

/** Feed every chunk, collecting all emitted parts. */
function run(chunks, { flush = true } = {}) {
  const parser = createSseParser();
  const parts = [];
  for (const chunk of chunks) {
    parts.push(...parser.feed(chunk));
  }
  if (flush) parts.push(...parser.flush());
  return parts;
}

test("ordinary completion: reasoning and text deltas in order, no tool calls", () => {
  const parts = run([
    reasoningDelta("thinking..."),
    textDelta("Hello"),
    textDelta(" world"),
    DONE,
  ]);
  assert.deepEqual(parts, [
    { type: "reasoning-delta", textDelta: "thinking..." },
    { type: "text-delta", textDelta: "Hello" },
    { type: "text-delta", textDelta: " world" },
  ]);
});

test("final data event without trailing newline is emitted on flush", () => {
  const parts = run([
    textDelta("Hello"),
    enc.encode('data: {"choices":[{"delta":{"content":"bye"}}]}'), // no newline
  ]);
  assert.deepEqual(parts, [
    { type: "text-delta", textDelta: "Hello" },
    { type: "text-delta", textDelta: "bye" },
  ]);
});

test("tool calls are emitted at end-of-stream without [DONE] or finish_reason", () => {
  const parts = run([
    toolCallDelta(0, "call_1", "web_search", '{"query": "ml"}'),
  ]);
  assert.deepEqual(parts, [
    {
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "web_search",
      input: { query: "ml" },
    },
  ]);
});

test("tool call arguments fragmented across data events accumulate", () => {
  const parts = run([
    toolCallDelta(0, "call_1", "get_weather", '{"city":'),
    toolCallDelta(0, undefined, undefined, ' "Stockholm"}'),
    DONE,
  ]);
  assert.deepEqual(parts, [
    {
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "get_weather",
      input: { city: "Stockholm" },
    },
  ]);
});

for (const terminal of ["done", "finish", "eof"]) {
  test(`invalid tool arguments fail without fabricating input at ${terminal}`, () => {
    const parser = createSseParser();
    assert.deepEqual(
      parser.feed(toolCallDelta(0, "call_1", "noop", '{"trunc')),
      [],
    );
    assert.throws(
      () =>
        terminal === "done"
          ? parser.feed(DONE)
          : terminal === "finish"
            ? parser.feed(finishEvent("tool_calls"))
            : parser.flush(),
      /Invalid tool call arguments/,
    );
  });
}

for (const terminal of ["done", "finish", "eof"]) {
  test(`parameterless tool call with empty arguments string emits empty input at ${terminal}`, () => {
    const parser = createSseParser();
    assert.deepEqual(
      parser.feed(toolCallDelta(0, "call_1", "get_time", "")),
      [],
    );
    const parts =
      terminal === "done"
        ? [...parser.feed(DONE), ...parser.flush()]
        : terminal === "finish"
          ? [...parser.feed(finishEvent("tool_calls")), ...parser.flush()]
          : parser.flush();
    assert.deepEqual(parts, [
      {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "get_time",
        input: {},
      },
    ]);
  });
}

test("final tool event without a newline is emitted exactly once at EOF", () => {
  const bytes = toolCallDelta(0, "call_1", "noop", '{"value":1}');
  const parser = createSseParser();
  assert.deepEqual(parser.feed(bytes.subarray(0, bytes.length - 2)), []);
  assert.deepEqual(parser.flush(), [
    {
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "noop",
      input: { value: 1 },
    },
  ]);
  assert.deepEqual(parser.flush(), []);
});

test("multiple tool calls are emitted in arrival order", () => {
  const parts = run([
    toolCallDelta(1, "call_b", "tool_b", "{}"),
    toolCallDelta(0, "call_a", "tool_a", "{}"),
    DONE,
  ]);
  assert.deepEqual(
    parts.map((p) => p.toolCallId),
    ["call_b", "call_a"],
  );
});

test("tool calls are emitted exactly once when both finish_reason and [DONE] appear", () => {
  const parts = run([
    toolCallDelta(0, "call_1", "tool_a", "{}"),
    finishEvent("tool_calls"),
    DONE,
  ]);
  assert.equal(parts.filter((p) => p.type === "tool-call").length, 1);
});

test("flush after [DONE] emits nothing", () => {
  const parser = createSseParser();
  const parts = [
    ...parser.feed(textDelta("hi")),
    ...parser.feed(DONE),
    ...parser.flush(),
    ...parser.flush(),
  ];
  assert.deepEqual(parts, [{ type: "text-delta", textDelta: "hi" }]);
});

test("bytes after [DONE] are ignored", () => {
  const parts = run([
    DONE,
    textDelta("late"),
    toolCallDelta(0, "call_1", "tool_a", "{}"),
  ]);
  assert.deepEqual(parts, []);
});

test("UTF-8 sequence split across chunks is not mangled", () => {
  // "🚀" is 4 bytes; split it byte-by-byte inside the JSON payload.
  const payload = enc.encode(
    `data: ${JSON.stringify({ choices: [{ delta: { content: "go 🚀 now" } }] })}\n\n`,
  );
  const rocketStart = payload.indexOf(0xf0); // first byte of the emoji
  const parts = run([
    payload.subarray(0, rocketStart + 1),
    payload.subarray(rocketStart + 1, rocketStart + 2),
    payload.subarray(rocketStart + 2, rocketStart + 3),
    payload.subarray(rocketStart + 3),
    DONE,
  ]);
  assert.deepEqual(parts, [{ type: "text-delta", textDelta: "go 🚀 now" }]);
});

test("keepalive events are skipped", () => {
  const parts = run([
    sseEvent({ model: "keepalive", choices: [{ delta: { content: "x" } }] }),
    textDelta("real"),
    DONE,
  ]);
  assert.deepEqual(parts, [{ type: "text-delta", textDelta: "real" }]);
});

test("malformed JSON data events are skipped without throwing", () => {
  const parts = run([enc.encode("data: {not json\n\n"), textDelta("ok"), DONE]);
  assert.deepEqual(parts, [{ type: "text-delta", textDelta: "ok" }]);
});

test("non-data lines (comments, blanks) are ignored", () => {
  const parts = run([
    enc.encode(": keepalive comment\n\n"),
    enc.encode("\n"),
    textDelta("ok"),
    DONE,
  ]);
  assert.deepEqual(parts, [{ type: "text-delta", textDelta: "ok" }]);
});

test("isDone becomes true at [DONE] and feed stops consuming", () => {
  const parser = createSseParser();
  parser.feed(DONE);
  assert.equal(parser.isDone(), true);
  assert.deepEqual(parser.feed(textDelta("late")), []);
});
