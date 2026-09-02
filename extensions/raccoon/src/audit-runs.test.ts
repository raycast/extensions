import assert from "node:assert/strict";
import { test } from "node:test";
import { newestFirst, stampToDate, summarise } from "./audit-runs.ts";

const RUN = JSON.stringify({
	timestamp: "2026-01-01_09:00:00",
	pass: 20,
	warning: 10,
	fail: 0,
	deep: false,
	results: [],
});

test("a saved run becomes a row with its counts", () => {
	const run = summarise("audit_2026-01-01_09:00:00.json", RUN);
	assert.equal(run?.pass, 20);
	assert.equal(run?.warning, 10);
	assert.equal(run?.fail, 0);
	assert.equal(run?.deep, false);
});

test("rcc's stamp is not a date any parser accepts, so it is converted by hand", () => {
	// "2026-01-01_09:00:00" — an underscore where a T belongs.
	assert.equal(Number.isNaN(Date.parse("2026-01-01_09:00:00")), true);
	const at = stampToDate("2026-01-01_09:00:00");
	assert.equal(at?.getFullYear(), 2026);
	assert.equal(at?.getHours(), 9);
});

test("a stamp that is not a date stays undefined rather than becoming a wrong one", () => {
	assert.equal(stampToDate("whenever"), undefined);
	const run = summarise("audit_whenever.json", RUN);
	assert.equal(run?.at, undefined);
	// The row still exists: the counts are readable even when the clock is not.
	assert.equal(run?.pass, 20);
});

test("a half-written run is skipped, not thrown", () => {
	assert.equal(
		summarise("audit_2026-01-01_09:00:00.json", '{"pass": 2'),
		undefined,
	);
});

test("a file that is not a saved run is not one", () => {
	assert.equal(summarise("README.md", RUN), undefined);
});

test("missing counts read as zero rather than NaN", () => {
	const run = summarise("audit_2026-01-01_09:00:00.json", "{}");
	assert.equal(run?.pass, 0);
	assert.equal(run?.fail, 0);
});

test("newest first", () => {
	const rows = [
		{ stamp: "2026-01-01_09:00:00" },
		{ stamp: "2026-03-01_09:00:00" },
		{ stamp: "2026-02-01_09:00:00" },
	] as Parameters<typeof newestFirst>[0][];
	assert.deepEqual(
		[...rows].sort(newestFirst).map((r) => r.stamp.slice(0, 10)),
		["2026-03-01", "2026-02-01", "2026-01-01"],
	);
});
