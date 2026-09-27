import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState } from "./empty-state.ts";

const nothingYet = { title: "No audit has been run on this Mac yet", description: "Run Security Audit once." };

test("nothing there is nothing there", () => {
	assert.deepEqual(emptyState(undefined, nothingYet, "The audit history"), nothingYet);
});

test("a read that failed is not an empty list", () => {
	// The screens used to say "No audit has been run on this Mac yet" and "No
	// machines configured" when the directory or the file could not be read at
	// all - stating as fact the one thing that was never established.
	assert.deepEqual(emptyState(new Error("EACCES: permission denied"), nothingYet, "The audit history"), {
		title: "The audit history could not be read",
		description: "EACCES: permission denied",
	});
});

test("something thrown that is not an Error still says what it was", () => {
	assert.equal(emptyState("boom", nothingYet, "The fleet file").description, "boom");
});
