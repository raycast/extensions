import assert from "node:assert/strict";
import { test } from "node:test";
import { auditTitle } from "./audit-title.ts";

test("with nothing read yet the screen is named, not counted", () => {
	assert.equal(auditTitle({ whole: false }), "Security Audit");
});

test("a finished audit is its counts", () => {
	assert.equal(
		auditTitle({ counts: { pass: 20, warn: 3, fail: 1 }, whole: true }),
		"Security Audit: 20 pass, 3 warn, 1 fail",
	);
});

test("counts from half an audit are not a verdict, and the group still running is named", () => {
	assert.equal(
		auditTitle({ counts: { pass: 6, warn: 0, fail: 0 }, whole: false, pending: "core" }),
		"Security Audit: still checking core",
	);
});

test("a group that failed ends the waiting: the report is partial, not still checking", () => {
	assert.equal(
		auditTitle({ counts: { pass: 6, warn: 0, fail: 0 }, whole: false, failed: true }),
		"Security Audit: 6 pass, 0 warn, 0 fail (partial)",
	);
});

test("a failure outranks a name left over from the run that ended in it", () => {
	assert.equal(
		auditTitle({ counts: { pass: 6, warn: 0, fail: 0 }, whole: false, pending: "core", failed: true }),
		"Security Audit: 6 pass, 0 warn, 0 fail (partial)",
	);
});
