import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appleScriptQuote, fixCommand, shellQuote } from "./terminal.ts";

test("a check name with spaces survives the shell", () => {
	assert.equal(shellQuote("Stealth Mode"), "'Stealth Mode'");
	assert.equal(shellQuote(".ssh Permissions"), "'.ssh Permissions'");
});

test("a quote in a name cannot end the argument", () => {
	assert.equal(shellQuote("it's"), `'it'\\''s'`);
});

// Checking the quoted text for dangerous substrings proves nothing: the
// substring is there, inert inside the literal. What matters is what a shell
// does with it, so a shell is asked.
test("a hostile name reaches the program as one argument, unchanged", () => {
	for (const name of [
		"x'; touch /tmp/rcc-should-not-exist; echo '",
		".ssh Permissions",
		'a "double" quote',
		"back\\slash",
		"$(whoami)",
		"`id`",
	]) {
		const out = execFileSync("/bin/sh", [
			"-c",
			`printf %s ${shellQuote(name)}`,
		]).toString();
		assert.equal(out, name, `mangled: ${name}`);
	}
	assert.ok(
		!existsSync("/tmp/rcc-should-not-exist"),
		"the quoted name executed something",
	);
});

test("a quote or a backslash cannot break out of the AppleScript literal", () => {
	assert.equal(appleScriptQuote('say "hi"'), '"say \\"hi\\""');
	assert.equal(appleScriptQuote("back\\slash"), '"back\\\\slash"');
});

test("the fix command names one check and widens to nothing else", () => {
	const cmd = fixCommand("/opt/homebrew/bin/rcc", ["Stealth Mode"]);
	assert.equal(
		cmd,
		"'/opt/homebrew/bin/rcc' audit --fix --force --fix-only 'Stealth Mode'",
	);
	// --only would have taken the group, which holds six checks.
	assert.ok(!cmd.includes("--only "), cmd);
});

test("a path with a space is quoted too", () => {
	const cmd = fixCommand("/Users/a b/rcc", ["VPN"]);
	assert.ok(cmd.startsWith("'/Users/a b/rcc'"), cmd);
});

test("several checks travel as one comma-separated argument", () => {
	const cmd = fixCommand("/usr/local/bin/rcc", [
		"Stealth Mode",
		"Bluetooth",
		".ssh Permissions",
	]);
	assert.equal(
		cmd,
		"'/usr/local/bin/rcc' audit --fix --force --fix-only 'Stealth Mode,Bluetooth,.ssh Permissions'",
	);
});

test("fixing nothing is refused rather than widened to everything", () => {
	// Without the guard the flag would carry an empty value, which rcc reads
	// as no filter at all: every fix on the machine.
	assert.throws(() => fixCommand("/usr/local/bin/rcc", []), /No check/);
});
