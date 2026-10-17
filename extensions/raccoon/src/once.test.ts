import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheUntilRejected, rememberYes } from "./once.ts";

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

test("a capability answered yes is remembered, and asked only once", async () => {
	let asks = 0;
	const supports = rememberYes(async () => {
		asks += 1;
		return true;
	});
	assert.equal(await supports("/opt/homebrew/bin/rcc --fix-only"), true);
	assert.equal(await supports("/opt/homebrew/bin/rcc --fix-only"), true);
	assert.equal(asks, 1);
});

test("a no is asked again: the binary may have been upgraded since", async () => {
	// supportsAuditFlag turns any failure into false, so a sticky false would
	// keep the reader out of the fixes for the rest of the session - including
	// after they upgrade rcc with Raycast still open.
	let asks = 0;
	const supports = rememberYes(async () => {
		asks += 1;
		return asks > 1;
	});
	assert.equal(await supports("rcc --fix-only"), false);
	assert.equal(await supports("rcc --fix-only"), true);
	assert.equal(await supports("rcc --fix-only"), true);
	assert.equal(asks, 2);
});

test("each binary and flag is remembered on its own", async () => {
	const asked: string[] = [];
	const supports = rememberYes(async (key: string) => {
		asked.push(key);
		return true;
	});
	await supports("/opt/homebrew/bin/rcc --fix-only");
	await supports("/usr/local/bin/rcc --fix-only");
	await supports("/opt/homebrew/bin/rcc --only");
	assert.equal(asked.length, 3);
});

test("a question that threw is asked again", async () => {
	let asks = 0;
	const supports = rememberYes(async () => {
		asks += 1;
		if (asks === 1) throw new Error("rcc vanished");
		return true;
	});
	await assert.rejects(supports("rcc --fix-only"));
	assert.equal(await supports("rcc --fix-only"), true);
	assert.equal(asks, 2);
});
