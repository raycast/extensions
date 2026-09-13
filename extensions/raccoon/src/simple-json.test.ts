import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseOverlap,
	parseTrash,
	parseWifi,
	byClash,
	clashLevel,
	groupByName,
	type NameGroup,
	type PathEntry,
} from "./simple-json.ts";

test("trash is read as path, size and count", () => {
	const t = parseTrash(
		'{"path":"/Users/alex/.Trash","size":"11M","count":6}',
	);
	assert.equal(t.count, 6);
	assert.equal(t.size, "11M");
});

test("an empty trash is a report, not a failure", () => {
	const t = parseTrash('{"path":"/Users/alex/.Trash","size":"0","count":0}');
	assert.equal(t.count, 0);
});

test("wifi keeps the networks and tolerates no active one", () => {
	const w = parseWifi(
		'{"interface":"en0","active_ssid":"","known_networks":["Home","Cafe"],"passwords":{}}',
	);
	assert.equal(w.active_ssid, "");
	assert.deepEqual(w.known_networks, ["Home", "Cafe"]);
});

test("a non-string in known_networks is dropped, not rendered", () => {
	const w = parseWifi(
		'{"interface":"en0","active_ssid":"Home","known_networks":["Home",null,7],"passwords":{}}',
	);
	assert.deepEqual(w.known_networks, ["Home"]);
});

test("overlap entries are checked, not cast", () => {
	const list = parseOverlap(
		'[{"name":"jq","path":"/opt/homebrew/bin/jq","resolved":"/opt/homebrew/bin/jq","manager":"brew"}]',
	);
	assert.equal(list[0].manager, "brew");
	assert.throws(
		() => parseOverlap('[{"name":"jq"}]'),
		/Entry 1 is not shaped/,
	);
});

test("output that is not JSON says which command failed", () => {
	assert.throws(() => parseTrash("-- Trash"), /rcc trash did not print JSON/);
	assert.throws(() => parseWifi("-- Wi-Fi"), /rcc wifi did not print JSON/);
	assert.throws(() => parseOverlap("[["), /rcc overlap did not print JSON/);
});

test("one row per name, not per PATH entry", () => {
	const e = (name: string, manager: string, path: string): PathEntry => ({
		name,
		path,
		resolved: path,
		manager,
	});
	const groups = groupByName([
		e("jq", "brew", "/opt/homebrew/bin/jq"),
		e("jq", "system", "/usr/bin/jq"),
		e("rg", "brew", "/opt/homebrew/bin/rg"),
	]);
	assert.equal(groups.length, 2);
	const jq = groups.find((g) => g.name === "jq");
	assert.deepEqual(jq?.managers, ["brew", "system"]);
	// PATH order decides which copy runs, so the first entry is the winner.
	assert.equal(jq?.entries[0].path, "/opt/homebrew/bin/jq");
});

test("the same manager twice is still one manager", () => {
	const e = (manager: string, path: string): PathEntry => ({
		name: "python3",
		path,
		resolved: path,
		manager,
	});
	const [group] = groupByName([
		e("brew", "/a/python3"),
		e("brew", "/b/python3"),
	]);
	assert.deepEqual(group.managers, ["brew"]);
	// Two copies is still a clash, even from one manager.
	assert.equal(clashLevel(group), "double");
});

test("three copies is worse than two, and sorts above it", () => {
	const g = (name: string, n: number): NameGroup => ({
		name,
		entries: Array.from({ length: n }, () => ({
			name,
			path: "/x",
			resolved: "/x",
			manager: "brew",
		})),
		managers: ["brew"],
	});
	assert.equal(clashLevel(g("pip3", 3)), "worse");
	assert.equal(clashLevel(g("jq", 2)), "double");
	assert.equal(clashLevel(g("rg", 1)), "single");
	const sorted = [g("rg", 1), g("jq", 2), g("pip3", 3)].sort(byClash);
	assert.deepEqual(
		sorted.map((x) => x.name),
		["pip3", "jq", "rg"],
	);
});
