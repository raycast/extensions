import { test } from "node:test";
import assert from "node:assert/strict";
import { health, humanAge, parseBackup } from "./backup-json.ts";

const report = (over: Record<string, unknown> = {}) =>
	JSON.stringify({
		destination: { configured: true, name: "Backup", kind: "Local" },
		phase: "BackupNotRunning",
		running: false,
		last_backup: { date: "2026-09-01", hours_ago: 3 },
		exclusions: [],
		...over,
	});

test("every field is read", () => {
	const b = parseBackup(report());
	assert.equal(b.destination.name, "Backup");
	assert.equal(b.last_backup.hours_ago, 3);
	assert.equal(b.running, false);
});

test("a Mac that has never been backed up is not one backed up zero hours ago", () => {
	const b = parseBackup(report({ last_backup: { date: "", hours_ago: -1 } }));
	assert.equal(b.last_backup.hours_ago, -1);
	assert.equal(health(b), "never");
});

test("a day is fine, a week is late, beyond that it is overdue", () => {
	const at = (hours: number) =>
		health(
			parseBackup(
				report({ last_backup: { date: "x", hours_ago: hours } }),
			),
		);
	assert.equal(at(0), "fresh");
	assert.equal(at(23), "fresh");
	assert.equal(at(24), "late");
	assert.equal(at(167), "late");
	assert.equal(at(168), "overdue");
});

test("the age is said the way a person says it", () => {
	assert.equal(humanAge(-1), "never");
	assert.equal(humanAge(0), "just now");
	assert.equal(humanAge(5), "5h ago");
	assert.equal(humanAge(24), "1 day ago");
	assert.equal(humanAge(72), "3 days ago");
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseBackup("-- Time Machine"), /did not print JSON/);
});
