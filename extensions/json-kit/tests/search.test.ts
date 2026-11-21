import { test } from "node:test";
import { strict as assert } from "node:assert";
import { searchText } from "../src/search";
import {
  parseDocument,
  MAX_GENERATED_BYTES,
  MAX_INPUT_BYTES,
} from "../src/json";

test("searches case, positions, unicode and invalid patterns", async () => {
  const result = await searchText("😀NAME\r\nname", "name", true);
  assert.deepEqual(
    result.matches.map(({ line, column }) => [line, column]),
    [
      [1, 2],
      [2, 1],
    ],
  );
  assert.equal((await searchText("NAME", "name", false)).matches.length, 0);
  await assert.rejects(searchText("x", "[", false));
});

test("limits zero-length matches and interrupts catastrophic regex", async () => {
  const result = await searchText("abcd", "(?=.)", false, 1000, 2);
  assert.equal(result.matches.length, 2);
  assert.equal(result.truncated, true);
  await assert.rejects(
    searchText("a".repeat(40000) + "!", "^(a+)+$", false, 150),
    /timed out/,
  );
});

test("shows context around matches late in a long line", async () => {
  const result = await searchText(
    "x".repeat(2000) + "needle" + "y".repeat(500),
    "needle",
    false,
  );
  assert.equal(result.matches.length, 1);
  assert.match(result.matches[0].excerpt, /needle/);
  assert.ok(result.matches[0].excerpt.length <= 302);
});

test("searches formatted output larger than the raw-input limit", async () => {
  const source = `[${Array(27000)
    .fill(`"${"x".repeat(35)}"`)
    .join(",")}]`;
  const pretty = parseDocument(source).pretty;
  assert.ok(Buffer.byteLength(pretty) > MAX_INPUT_BYTES);
  await assert.rejects(searchText(pretty, "0", false));
  const result = await searchText(
    pretty,
    "x",
    false,
    2000,
    1,
    MAX_GENERATED_BYTES,
  );
  assert.equal(result.matches.length, 1);
  assert.equal(result.truncated, true);
});
