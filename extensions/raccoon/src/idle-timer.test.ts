import assert from "node:assert/strict";
import { test } from "node:test";
import { idleTimer } from "./idle-timer.ts";

const after = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("silence for the whole window is what fires it", async () => {
	let fired = 0;
	const timer = idleTimer(30, () => (fired += 1));
	await after(60);
	assert.equal(fired, 1);
	timer.stop();
});

test("output keeps the run alive, however long the run is", async () => {
	// The point of measuring silence and not duration: a brew upgrade that
	// prints for twenty minutes is working, not hung.
	let fired = 0;
	const timer = idleTimer(40, () => (fired += 1));
	for (let i = 0; i < 4; i += 1) {
		await after(20);
		timer.poke();
	}
	assert.equal(fired, 0);
	timer.stop();
});

test("stopping ends it: a finished run must not fire later", async () => {
	let fired = 0;
	const timer = idleTimer(20, () => (fired += 1));
	timer.stop();
	await after(50);
	assert.equal(fired, 0);
});

test("it fires once, and a poke afterwards does not arm it again", async () => {
	// Chunks from a run that has already been given up on must not restart it.
	let fired = 0;
	const timer = idleTimer(20, () => (fired += 1));
	await after(50);
	timer.poke();
	await after(50);
	assert.equal(fired, 1);
	timer.stop();
});
