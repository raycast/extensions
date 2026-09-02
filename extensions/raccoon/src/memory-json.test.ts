import { test } from "node:test";
import assert from "node:assert/strict";
import { displayName, megabytes, parseMemory, weight } from "./memory-json.ts";

test("a process list is read field by field", () => {
	const list = parseMemory(
		JSON.stringify([{ pid: 1, rss: 586256, command: "claude" }]),
	);
	assert.equal(list.length, 1);
	assert.equal(list[0].pid, 1);
});

test("rss is kilobytes, and the row shows megabytes", () => {
	// 586256 KB is what the JSON carries for the process the table calls 573 MB.
	assert.equal(megabytes(586256), 573);
	assert.equal(megabytes(0), 0);
});

test("weight bands are measured in megabytes, not kilobytes", () => {
	assert.equal(weight(100 * 1024), "light");
	assert.equal(weight(512 * 1024), "heavy");
	assert.equal(weight(1023 * 1024), "heavy");
	assert.equal(weight(1024 * 1024), "huge");
});

test("the name is the last path component, not the whole path", () => {
	assert.equal(
		displayName("/Applications/Safari.app/Contents/MacOS/Safari"),
		"Safari",
	);
	assert.equal(displayName("claude"), "claude");
	assert.equal(displayName("/"), "/");
});

test("output that is not a list of processes says so", () => {
	assert.throws(() => parseMemory("-- Memory Usage"), /did not print JSON/);
	assert.throws(
		() => parseMemory("{}"),
		/rcc memory printed JSON, but not a list/,
	);
	assert.throws(
		() => parseMemory(JSON.stringify([{ pid: 1 }])),
		/Process 1 is not shaped/,
	);
});
