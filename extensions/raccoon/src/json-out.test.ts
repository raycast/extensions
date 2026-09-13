import assert from "node:assert/strict";
import { test } from "node:test";
import {
	expectObject,
	extractJson,
	readJson,
	JSON_TIMEOUT_MS,
} from "./json-out.ts";

test("a report printed before the JSON is still read", () => {
	const parsed = extractJson('[1/3] scanning...\n{"a":1}', "certs");
	assert.deepEqual(parsed, { a: 1 });
});

test("prose with no document in it is blamed on the version, which is the fix", () => {
	try {
		extractJson("[1/4] PATH entries...\n| Path | Status |\n", "env");
		assert.fail("should have thrown");
	} catch (e) {
		assert.match((e as Error).message, /brew upgrade rcc/);
	}
});

test("a malformed document is NOT blamed on the version", () => {
	// rcc fonts --json wrote an empty count into an otherwise well-formed
	// report, and the reader was told to upgrade a CLI that was already current.
	try {
		extractJson(
			'{\n  "fontconfig": {"fonts": , "families": 3}\n}',
			"fonts",
		);
		assert.fail("should have thrown");
	} catch (e) {
		const m = (e as Error).message;
		assert.ok(
			!m.includes("brew upgrade rcc"),
			"must not blame the version",
		);
		assert.match(m, /defect in rcc/);
	}
});

test("the failure carries the output, so the next one names itself", () => {
	try {
		extractJson('{"fonts": , }', "fonts");
		assert.fail("should have thrown");
	} catch (e) {
		assert.match((e as Error).message, /\{"fonts": , \}/);
	}
});

test("a very long output is cut, and says it was cut", () => {
	const long = `{${"x".repeat(900)}`;
	try {
		extractJson(long, "ports");
		assert.fail("should have thrown");
	} catch (e) {
		const m = (e as Error).message;
		assert.ok(
			m.length < long.length,
			"excerpt must be shorter than the output",
		);
		assert.match(m, /…/);
	}
});

test("empty output says so instead of guessing", () => {
	assert.throws(() => extractJson("   \n", "trash"), /printed nothing/);
});

test("valid JSON that is not an object is refused by name", () => {
	assert.throws(() => expectObject("[1,2]", "memory"), /not a report object/);
});

test("a command killed by its timeout is reported as cut off, not as bad JSON", () => {
	// The shape that reached a user: `fonts --json` outran useExec's timeout,
	// Raycast killed it, and the document stopped one line before its closing
	// brace. Parsing that fragment blamed rcc for a defect it does not have.
	const truncated =
		'{\n  "installed": 812,\n  "fontconfig": {"fonts": 940},\n';
	assert.throws(
		() =>
			readJson("fonts", (s) => expectObject(s, "fonts"))({
				stdout: truncated,
				stderr: "",
				exitCode: null,
				signal: "SIGTERM",
			}),
		/cut off/,
	);
});

test("the cut-off message names the timeout, so the reader knows what to raise", () => {
	assert.throws(
		() =>
			readJson("fonts", () => ({}))({
				stdout: "",
				stderr: "",
				exitCode: null,
				signal: "SIGTERM",
			}),
		new RegExp(String(JSON_TIMEOUT_MS / 1000)),
	);
});

test("an ordinary failure is not mistaken for a timeout", () => {
	// exitCode 2 is how rcc reports findings; it is not a failure to parse.
	const doc = '{"installed": 1}';
	assert.deepEqual(
		readJson("fonts", (s) => expectObject(s, "fonts"))({
			stdout: doc,
			stderr: "",
			exitCode: 2,
			signal: null,
		}),
		{ installed: 1 },
	);
});
