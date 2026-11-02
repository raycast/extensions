import { test } from "node:test";
import { strict as assert } from "node:assert";
import { searchText } from "../src/search";

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
