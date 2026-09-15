import assert from "node:assert/strict";
import { test } from "node:test";
import { installOutcome } from "./install-outcome.ts";

const command = "brew install thousandflowers/tap/rcc";

test("a clean install is an install", () => {
	assert.deepEqual(installOutcome({ code: 0, signal: null }, command), { installed: true });
});

test("a non-zero status is reported, with the status in it", () => {
	const outcome = installOutcome({ code: 1, signal: null }, command);
	assert.equal(outcome.installed, false);
	assert.match(outcome.installed === false ? outcome.why : "", /status 1/);
});

test("a killed brew is not a success, whatever its exit code says", () => {
	// The pipe reports no code for a killed command, and that arrives as 0.
	// Reading the number alone turned a half-finished install into a green
	// screen.
	const outcome = installOutcome({ code: 0, signal: "SIGTERM" }, command);
	assert.equal(outcome.installed, false);
	assert.match(outcome.installed === false ? outcome.why : "", /stopped by SIGTERM/);
});
