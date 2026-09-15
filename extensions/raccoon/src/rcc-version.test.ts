import assert from "node:assert/strict";
import { test } from "node:test";
import { isAtLeast, meetsMinimum, parseRccVersion, type RccVersion } from "./rcc-version.ts";

test("the version is read out of what rcc --version prints", () => {
	assert.deepEqual(parseRccVersion("Raccoon version 1.0.1\nmacOS companion toolkit\n"), [1, 0, 1]);
});

test("a banner without a number is unknown, not old", () => {
	assert.equal(parseRccVersion("Raccoon\n"), undefined);
});

test("a version is compared part by part, not as text", () => {
	const minimum: RccVersion = [1, 0, 1];
	// 0.9.10 sorts after 0.17.0 as a string; as a version it comes before.
	assert.equal(isAtLeast([0, 17, 0], minimum), false);
	assert.equal(isAtLeast([1, 0, 0], minimum), false);
	assert.equal(isAtLeast([1, 0, 1], minimum), true);
	assert.equal(isAtLeast([1, 0, 2], minimum), true);
	assert.equal(isAtLeast([2, 0, 0], minimum), true);
});

test("the export is refused on the versions that cannot do it, and allowed on the rest", () => {
	const needed: RccVersion = [1, 0, 1];
	// --export arrived in 1.0.1. Older versions do not reject the flag: they
	// run an ordinary audit and print no path, so the refusal has to happen
	// here rather than being read out of a failure.
	assert.equal(meetsMinimum("Raccoon version 1.0.0\nmacOS companion toolkit\n", needed), false);
	assert.equal(meetsMinimum("Raccoon version 0.18.1\n", needed), false);
	assert.equal(meetsMinimum("Raccoon version 1.0.1\n", needed), true);
	assert.equal(meetsMinimum("Raccoon version 1.2.0\n", needed), true);
	// Unreadable is not the same as old.
	assert.equal(meetsMinimum("Raccoon\n", needed), true);
});
