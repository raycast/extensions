import assert from "node:assert/strict";
import { test } from "node:test";
import {
	bootoutAgents,
	deleteCertificates,
	forgetNetworks,
	killPids,
	removeLoginItems,
	removeSymlink,
	gitPush,
	gitPushAll,
	repoStatus,
	whichAll,
} from "./fixes.ts";

test("kill asks the processes to quit, and never asks twice for one", () => {
	assert.equal(killPids([412, 9001]), "kill 412 9001");
});

test("kill refuses pid 1 and anything that is not a pid", () => {
	// launchd is pid 1. Killing it takes the machine down.
	assert.throws(() => killPids([1]));
	assert.throws(() => killPids([]));
	assert.equal(killPids([1, 0, -5, 77]), "kill 77");
});

test("a network name with a quote in it cannot break out of the command", () => {
	const cmd = forgetNetworks("en0", ["Bob's iPhone"]);
	assert.match(cmd, /'Bob'\\''s iPhone'/);
	assert.ok(!cmd.includes("; rm"));
});

test("forgetting several networks runs one command per network", () => {
	const cmd = forgetNetworks("en0", ["a", "b"]);
	assert.equal(cmd.split("&&").length, 2);
});

test("a dangling symlink is removed without sudo first", () => {
	const cmd = removeSymlink(["/usr/local/bin/cagent"]);
	// A link in the reader's own bin directory must not ask for a password.
	assert.ok(cmd.startsWith("rm -f '/usr/local/bin/cagent'"));
	assert.ok(cmd.includes("|| sudo rm -f"));
});

test("a login item name is passed as a quoted AppleScript string", () => {
	assert.match(removeLoginItems(["Raycast"]), /login item "Raycast"/);
	// A name carrying a double quote must stay inside the string.
	assert.match(removeLoginItems(['He said "hi"']), /\\"hi\\"/);
});

test("certificate deletion is scoped to the login keychain", () => {
	const cmd = deleteCertificates(["Adobe Content Certificate 10-6"]);
	assert.ok(cmd.includes("login.keychain-db"));
	// Never the System keychain: other software depends on its roots.
	assert.ok(!cmd.includes("/System/"));
});

test("stopping an agent addresses this login session, not the whole machine", () => {
	assert.equal(
		bootoutAgents(["mailbrief"]),
		"launchctl bootout gui/$(id -u)/'mailbrief'",
	);
});

test("every builder refuses an empty list rather than acting on everything", () => {
	assert.throws(() => removeSymlink([]));
	assert.throws(() => forgetNetworks("en0", []));
	assert.throws(() => removeLoginItems([]));
	assert.throws(() => bootoutAgents([]));
	assert.throws(() => deleteCertificates([]));
});

test("a repository path with a space stays one argument", () => {
	assert.equal(
		repoStatus("/Users/me/My Repo"),
		"cd '/Users/me/My Repo' && git status",
	);
	assert.equal(whichAll("2to3-3.11"), "which -a '2to3-3.11'");
});

test("pushing names no branch: where the work belongs is not ours to decide", () => {
	const cmd = gitPush("/Users/me/r");
	assert.equal(cmd, "cd '/Users/me/r' && git push");
	assert.ok(!cmd.includes("main"));
	assert.ok(!cmd.includes("--force"));
});

test("pushing several stops at the first refusal instead of ploughing on", () => {
	const cmd = gitPushAll(["/a", "/b"]);
	assert.equal(cmd, "(cd '/a' && git push) && (cd '/b' && git push)");
	assert.throws(() => gitPushAll([]));
});
