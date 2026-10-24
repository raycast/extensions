import assert from "node:assert/strict";
import test from "node:test";
import { appendFzfOutputChunk, createFzfOutputState, MAX_FZF_RESULTS } from "../src/lib/fzf-output.ts";

test("fzf output is strictly capped when a single stdout chunk has too many entries", () => {
  const state = createFzfOutputState();
  const oversized = Buffer.from(
    Array.from({ length: 159 }, (_, i) => "/test/file-" + i + "\0").join(""),
  );
  appendFzfOutputChunk(state, oversized);
  assert.equal(state.limitReached, true);
  assert.equal(state.results.length, MAX_FZF_RESULTS);
  assert.equal(state.results[0], "/test/file-0");
  assert.equal(state.results.at(-1), "/test/file-149");

  // Queued data events after SIGTERM must never add more results.
  appendFzfOutputChunk(state, Buffer.from("/test/extra\0"));
  assert.equal(state.results.length, MAX_FZF_RESULTS);
});

test("fzf output preserves UTF-8 names across chunk boundaries", () => {
  const state = createFzfOutputState();
  const source = Buffer.from("/test/中文文件.txt\0/test/with newline\nfile.pdf\0", "utf8");
  const first = source.indexOf(Buffer.from("中文")) + 1;
  appendFzfOutputChunk(state, source.subarray(0, first));
  appendFzfOutputChunk(state, source.subarray(first, first + 3));
  appendFzfOutputChunk(state, source.subarray(first + 3));
  assert.deepEqual(state.results, ["/test/中文文件.txt", "/test/with newline\nfile.pdf"]);
  assert.equal(state.limitReached, false);
  assert.equal(state.pending.length, 0);
});

test("fzf output caps across multiple 100-result stdout chunks", () => {
  const state = createFzfOutputState();
  const lines = Array.from({ length: 180 }, (_, i) => "item-" + i + "\0");
  appendFzfOutputChunk(state, Buffer.from(lines.slice(0, 100).join("")));
  assert.equal(state.results.length, 100);
  appendFzfOutputChunk(state, Buffer.from(lines.slice(100).join("")));
  assert.equal(state.results.length, MAX_FZF_RESULTS);
  assert.equal(state.limitReached, true);
});

test("empty records do not appear as results", () => {
  const state = createFzfOutputState();
  appendFzfOutputChunk(state, Buffer.from("\0foo\0\0bar\0"));
  assert.deepEqual(state.results, ["foo", "bar"]);
});
