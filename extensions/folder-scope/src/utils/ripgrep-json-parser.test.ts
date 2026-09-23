import assert from "node:assert/strict";
import { test } from "node:test";
import { RipgrepJsonParser } from "./ripgrep-json-parser.ts";

test("buffers split records and split UTF-8 characters", () => {
  const parser = new RipgrepJsonParser();
  const output = Buffer.from(
    `${JSON.stringify({ type: "begin", data: { path: { text: "Ölçüm.txt" } } })}\n` +
      `${JSON.stringify({ type: "summary", data: {} })}\n`,
  );
  const split = output.indexOf(Buffer.from("Ö")) + 1;
  assert.deepEqual(parser.push(output.subarray(0, split)), []);
  const records = parser.push(output.subarray(split));
  assert.deepEqual(
    records.map((record) => record.kind === "event" && record.event.type),
    ["begin", "summary"],
  );
});

test("reports malformed and unknown records without stopping later events", () => {
  const parser = new RipgrepJsonParser();
  const records = parser.push(
    `{bad json}\n${JSON.stringify({ type: "future-event", data: { value: 1 } })}\n${JSON.stringify({ type: "end", data: {} })}\n`,
  );
  assert.deepEqual(
    records.map((record) => record.kind),
    ["malformed", "unknown", "event"],
  );
});

test("parses a final record without a trailing newline", () => {
  const parser = new RipgrepJsonParser();
  parser.push(JSON.stringify({ type: "summary", data: {} }));
  const records = parser.finish();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.kind, "event");
});

test("bounds an oversized partial record and resumes after its newline", () => {
  const parser = new RipgrepJsonParser(128);
  assert.equal(parser.push("x".repeat(129))[0]?.kind, "malformed");
  const records = parser.push(`discarded\n${JSON.stringify({ type: "end", data: {} })}\n`);
  assert.equal(records.length, 1);
  assert.equal(records[0]?.kind, "event");
});
