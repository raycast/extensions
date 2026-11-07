import assert from "node:assert/strict";
import test from "node:test";
import { buildDownieURL, parseLinks } from "../src/urls";

test("Nested URL query, Unicode and spaced destination survive scheme round-trip", () => {
  const link = "https://www.youtube.com/watch?v=sample&list=items#chapter";
  const destination = "/Users/example/Downloads/Café Videos";
  const url = new URL(buildDownieURL(link, { postprocessing: "audio", destination }));
  assert.equal(url.searchParams.get("url"), link);
  assert.equal(url.searchParams.get("postprocessing"), "audio");
  assert.equal(url.searchParams.get("destination"), destination);
  assert.equal(url.searchParams.size, 3);
});

test("Input review accepts CRLF and deduplicates without losing a source query", () => {
  assert.deepEqual(parseLinks("\r\nhttps://example.com/a?q=1&v=2\r\nhttps://example.com/b\r\nhttps://example.com/b"), [
    "https://example.com/a?q=1&v=2", "https://example.com/b",
  ]);
});

test("Reject empty, non-network, prose, overlarge batch, and multi-URL single requests", () => {
  for (const input of ["", "file:///Users/example/test.mp4", "downie://XUOpenURL", "https://example.com/a https://example.com/b"]) {
    assert.throws(() => parseLinks(input));
  }
  assert.throws(() => parseLinks(Array.from({ length: 51 }, (_, i) => `https://example.com/${i}`).join("\n")));
  assert.throws(() => buildDownieURL("https://example.com/a\nhttps://example.com/b", { postprocessing: "default" }));
});

test("Guided extraction overrides postprocessing and default leaves Downie settings untouched", () => {
  const extraction = new URL(buildDownieURL("https://example.com/video", { postprocessing: "audio", extraction: true }));
  assert.equal(extraction.searchParams.get("action"), "open_in_uge");
  assert.equal(extraction.searchParams.has("postprocessing"), false);
  const normal = new URL(buildDownieURL("https://example.com/video", { postprocessing: "default" }));
  assert.deepEqual([...normal.searchParams.keys()], ["url"]);
});
