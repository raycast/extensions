// Zero-dependency check: node --test src/audit-json.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
	countByStatus,
	fixableCount,
	parseAuditReport,
	readAuditRun,
} from "./audit-json.ts";

const check = (over = {}) => ({
	status: "pass",
	category: "Core Security",
	name: "Gatekeeper",
	value: "Enabled",
	cis: "2.5.5 — Enable Gatekeeper",
	command: "spctl --status",
	fix_available: false,
	...over,
});

const report = (results: unknown[] = [check()]) =>
	JSON.stringify({
		timestamp: "2026-08-31T19:44:31+02:00",
		audit_type: "basic",
		pass: 1,
		warning: 0,
		fail: 0,
		results,
	});

const run = (over = {}) => ({
	stdout: report(),
	stderr: "",
	exitCode: 0,
	signal: null,
	...over,
});

test("a well-formed report parses", () => {
	const parsed = parseAuditReport(report());
	assert.equal(parsed.results.length, 1);
	assert.equal(parsed.results[0].name, "Gatekeeper");
	assert.equal(parsed.results[0].fix_available, false);
});

test("empty stdout is a readable error, not a crash", () => {
	assert.throws(() => parseAuditReport("   \n"), /printed nothing/);
});

test("stdout that is not JSON says so", () => {
	// What `rcc audit --json` printed before 0.17.0: the boxed report, then the
	// JSON. The extension runs against whatever rcc is installed, so it reads
	// the trailing object instead of refusing.
	const mixed = parseAuditReport("+-----+\n| Core |\n+-----+\n" + report());
	assert.equal(mixed.results.length, 1);

	// A brace inside the report's own text is not the start of the document.
	const noisy = parseAuditReport("| note: {not json} |\n" + report());
	assert.equal(noisy.results.length, 1);

	// Output with no JSON anywhere still fails, and says what to do about it.
	assert.throws(
		() => parseAuditReport("+-----+\n| Core |\n+-----+"),
		/did not print JSON/,
	);
});

test("JSON that is not a report object says so", () => {
	assert.throws(() => parseAuditReport("[1, 2, 3]"), /not a report object/);
	assert.throws(() => parseAuditReport('{"pass": 1}'), /no results array/);
});

test("a result missing a field is named, not rendered as undefined", () => {
	// Not fix_available: that one is optional on purpose, because rcc before
	// 0.17.0 does not emit it. command is still required.
	const broken = { ...check() } as Record<string, unknown>;
	delete broken.command;
	assert.throws(
		() => parseAuditReport(report([check(), broken])),
		/Result 2 of 2/,
	);
});

test("a report from an rcc older than 0.17.0 still renders", () => {
	const old = { ...check() } as Record<string, unknown>;
	delete old.fix_available;
	const parsed = parseAuditReport(report([old]));
	assert.equal(parsed.results.length, 1);
	// Unknown is not fixable: the count must not guess.
	assert.equal(fixableCount(parsed, new Set()), 0);
});

test("an unknown status is not a status", () => {
	assert.throws(
		() => parseAuditReport(report([check({ status: "maybe" })])),
		/not shaped like a check/,
	);
});

// --- exit codes -------------------------------------------------------------
//
// audit carries its findings in its status: 0 all passed, 1 a check failed,
// 2 warnings only. Those are reports. The same 2 comes back from a usage error
// that prints nothing, and telling them apart is what keeps a healthy audit from
// being shown as a failure.

test("exit 0 with a report is a report", () => {
	assert.equal(readAuditRun(run()).results.length, 1);
});

test("exit 1 with a report is a report, not a failure", () => {
	assert.equal(readAuditRun(run({ exitCode: 1 })).results.length, 1);
});

test("exit 2 with a report is a report, not a failure", () => {
	assert.equal(readAuditRun(run({ exitCode: 2 })).results.length, 1);
});

test("exit 2 with nothing on stdout is a failure", () => {
	// `rcc audit --only nonesuch`: usage error, same status, no report.
	assert.throws(
		() =>
			readAuditRun(
				run({ exitCode: 2, stdout: "", stderr: "unknown check group" }),
			),
		/exited with status 2/,
	);
});

test("the failure carries what stderr said", () => {
	assert.throws(
		() =>
			readAuditRun(
				run({
					exitCode: 64,
					stdout: "",
					stderr: "not implemented yet",
				}),
			),
		/not implemented yet/,
	);
});

test("a run the user stopped is not a failure", () => {
	assert.equal(
		readAuditRun(run({ exitCode: null, signal: "SIGTERM" })).results.length,
		1,
	);
});

test("a run that timed out says so rather than failing to parse", () => {
	assert.throws(
		() => readAuditRun(run({ timedOut: true, stdout: "" })),
		/ran out of time/,
	);
});

// --- derived counts ---------------------------------------------------------

test("counts come from the results, not from the header", () => {
	const parsed = parseAuditReport(
		report([check(), check({ status: "warn" }), check({ status: "fail" })]),
	);
	assert.deepEqual(countByStatus(parsed), { pass: 1, warn: 1, fail: 1 });
});

test("a machine with nothing to fix reports zero, not an error", () => {
	assert.equal(fixableCount(parseAuditReport(report())), 0);
	assert.equal(
		fixableCount(
			parseAuditReport(report([check({ fix_available: true })])),
		),
		1,
	);
});

test("a skipped check is not counted among the fixable", () => {
	// rcc audit --fix skips it, so counting it would promise a fix that is not
	// coming and put a wrong number on the screen-level action.
	const parsed = parseAuditReport(
		report([
			check({ name: "Firewall", fix_available: true }),
			check({ name: "Stealth Mode", fix_available: true }),
			check({ name: "Gatekeeper", fix_available: false }),
		]),
	);
	assert.equal(fixableCount(parsed), 2);
	assert.equal(fixableCount(parsed, new Set(["Firewall"])), 1);
	assert.equal(
		fixableCount(parsed, new Set(["Firewall", "Stealth Mode"])),
		0,
	);
	// A name in the list that no check carries changes nothing.
	assert.equal(fixableCount(parsed, new Set(["Nonesuch"])), 2);
});
