import assert from "node:assert/strict";
import test from "node:test";
import { parseWindowReply } from "../src/protocol.ts";

test("closing the window without Paste leaves the active app untouched", () => {
  assert.equal(parseWindowReply(""), undefined);
  assert.equal(parseWindowReply(" \n"), undefined);
});
test("preserves Unicode, line breaks, shell-like text and rich HTML", () => {
  const reply = {
    action: "paste",
    text: "Привет 👋\n$(example) `code`",
    html: "<p><b>Привет</b> 👋</p>",
  };
  assert.deepEqual(parseWindowReply(JSON.stringify(reply)), reply);
});
test("rejects malformed responses before sending anything to the active app", () => {
  for (const output of [
    "null",
    "[]",
    "{}",
    '{"action":"delete","text":"x"}',
    '{"action":"paste","text":4}',
    '{"action":"paste","text":"x","html":{}}',
    "not JSON",
  ]) {
    assert.throws(() => parseWindowReply(output));
  }
});
