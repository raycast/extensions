import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHistory, used } from "./history-json.ts";

test("counts and recent commands are read", () => {
	const h = parseHistory(
		'{"counts":{"zsh":1525,"bash":545,"fish":0,"total":2070},"recent":["gh","brew"]}',
	);
	assert.equal(h.counts.zsh, 1525);
	assert.deepEqual(h.recent, ["gh", "brew"]);
});

test("a missing field is zero rather than undefined on screen", () => {
	const h = parseHistory('{"counts":{},"recent":[]}');
	assert.equal(h.counts.total, 0);
	assert.deepEqual(h.recent, []);
});

test("an unused shell is told apart from a used one", () => {
	assert.equal(used(0), false);
	assert.equal(used(1), true);
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseHistory("-- Shell History"), /did not print JSON/);
});
