import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv, problems, shortVersion } from "./env-json.ts";

const full = JSON.stringify({
	path: [
		{ path: "/usr/bin", exists: true },
		{ path: "/gone", exists: false },
	],
	broken_symlinks: [
		{ name: "cagent", link: "/usr/local/bin/cagent", target: "/nowhere" },
	],
	duplicates: ["/usr/bin"],
	tools: [
		{ name: "git", found: true, version: "git version 2.55.0" },
		{ name: "wget", found: false, version: null },
	],
});

test("every section is read", () => {
	const e = parseEnv(full);
	assert.equal(e.path.length, 2);
	assert.equal(e.broken_symlinks[0].name, "cagent");
	assert.deepEqual(e.duplicates, ["/usr/bin"]);
	assert.equal(e.tools[1].version, null);
});

test("the count is what is wrong, not what was looked at", () => {
	// One missing entry, one broken link, one duplicate.
	assert.equal(problems(parseEnv(full)), 3);
	assert.equal(
		problems(
			parseEnv('{"path":[{"path":"/usr/bin","exists":true}],"tools":[]}'),
		),
		0,
	);
});

test("a version is trimmed to the part that identifies it", () => {
	assert.equal(shortVersion("git version 2.55.0"), "git version 2.55.0");
	assert.equal(
		shortVersion("curl 8.7.1 (x86_64-apple-darwin25.0) libcurl/8.7.1 zlib"),
		"curl 8.7.1",
	);
	assert.ok(shortVersion("x".repeat(100)).length <= 60);
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseEnv("-- PATH Entries"), /did not print JSON/);
});
