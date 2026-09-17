import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheUntilRejected } from "./once.ts";

test("the answer is read once and handed to everyone after", async () => {
	let reads = 0;
	const read = cacheUntilRejected(async () => {
		reads += 1;
		return "/usr/bin:/bin";
	});
	assert.equal(await read(), "/usr/bin:/bin");
	assert.equal(await read(), "/usr/bin:/bin");
	assert.equal(reads, 1);
});

test("a failure is not the answer: the next caller reads again", async () => {
	// The bug this exists for: `cached ??= read()` never reassigns, because a
	// rejected promise is not nullish - so one broken startup file made every
	// later call fail for the life of the process, Run Again included.
	let reads = 0;
	const read = cacheUntilRejected(async () => {
		reads += 1;
		if (reads === 1) throw new Error("zsh did not report its PATH.");
		return "/opt/homebrew/bin";
	});
	await assert.rejects(read(), /did not report its PATH/);
	assert.equal(await read(), "/opt/homebrew/bin");
	assert.equal(reads, 2);
});

test("callers that arrive while the read is in flight share the one read", async () => {
	let reads = 0;
	const read = cacheUntilRejected(async () => {
		reads += 1;
		await new Promise((resolve) => setTimeout(resolve, 10));
		return "/usr/bin";
	});
	const [a, b] = await Promise.all([read(), read()]);
	assert.equal(a, b);
	assert.equal(reads, 1);
});
