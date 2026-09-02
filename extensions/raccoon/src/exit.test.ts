// Zero-dependency check: node --test src/exit.test.ts
//
// The statuses below were read off the real CLI, not only off bin/audit.sh:
//   rcc ports|disk|battery      -> 0
//   rcc audit --quiet           -> 0
//   rcc audit --only nonesuch   -> 2   (usage error, nothing on stdout)
//   rcc nonesuch                -> 1
import assert from "node:assert/strict";
import { test } from "node:test";
import { isFailure, type RccExit } from "./exit.ts";

const exited = (code: number): RccExit => ({ code, signal: null });

test("a clean run is not a failure", () => {
	assert.equal(isFailure(["ports"], exited(0), true), false);
});

test("any other command exiting non-zero is a failure", () => {
	assert.equal(isFailure(["nonesuch"], exited(1), false), true);
	assert.equal(isFailure(["disk"], exited(1), true), true);
});

test("audit reports its findings through its status, not by failing", () => {
	assert.equal(isFailure(["audit"], exited(1), true), false);
	assert.equal(isFailure(["audit"], exited(2), true), false);
	assert.equal(isFailure(["audit", "deep"], exited(1), true), false);
});

test("audit exiting 2 without a report is the usage error, not warnings", () => {
	assert.equal(isFailure(["audit"], exited(2), false), true);
});

test("a status audit never uses to report is still a failure", () => {
	assert.equal(isFailure(["audit"], exited(3), true), true);
	assert.equal(isFailure(["audit"], exited(127), true), true);
});

test("a command the user stopped has not failed", () => {
	assert.equal(
		isFailure(["upgrade"], { code: 0, signal: "SIGTERM" }, true),
		false,
	);
	assert.equal(
		isFailure(["audit"], { code: 0, signal: "SIGTERM" }, false),
		false,
	);
});
