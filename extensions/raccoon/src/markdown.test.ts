// Zero-dependency check: node --test src/markdown.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingFixCount, quietOutcome, SUDO_HINT, toMarkdown, withSudoHint } from "./markdown.ts";

test("section headers become h2", () => {
	assert.equal(toMarkdown("-- Battery Status").trim(), "## Battery Status");
});

test("consecutive status lines keep their line breaks", () => {
	assert.equal(toMarkdown("OK Scanned\n○ 812 fonts total"), "OK Scanned  \n○ 812 fonts total  ");
});

test("markdown tables are left alone apart from the hard break", () => {
	const table = "| Metric | Value |\n| ------ | ----- |\n| Cycle Count | 691 |";
	assert.deepEqual(
		toMarkdown(table)
			.split("\n")
			.map((line) => line.trimEnd()),
		table.split("\n"),
	);
});

test("ascii boxes are fenced verbatim, with no hard breaks inside", () => {
	const box = ["+-------------+", "| Core Security |", "| SIP: Enabled  |", "+-------------+"].join("\n");
	assert.equal(toMarkdown(box), ["```", ...box.split("\n"), "```"].join("\n"));
});

test("a box at the end of the output still gets closed", () => {
	const out = toMarkdown("intro\n+---+\n| a |\n+---+");
	assert.equal(out.split("\n").filter((line) => line === "```").length, 2);
	assert.ok(out.endsWith("```"));
});

test("prompts Raycast cannot answer are dropped", () => {
	assert.equal(toMarkdown("done\nFix 8 issue(s) automatically? [y/N] ").trim(), "done");
});

test("pending fixes are counted from the dropped prompt", () => {
	assert.equal(pendingFixCount("Fix 8 issue(s) automatically? [y/N] "), 8);
	assert.equal(pendingFixCount("all clear"), 0);
});

test("blank lines stay blank", () => {
	assert.equal(toMarkdown("a\n\nb"), "a  \n\nb  ");
});

test("the Touch ID hint is appended only when sudo was unavailable", () => {
	assert.equal(withSudoHint("all good"), "all good");
	assert.ok(withSudoHint("⚠ sudo unavailable — sudo checks skipped").endsWith(SUDO_HINT));
	assert.ok(withSudoHint("✗ Deep scan requires sudo — skipped").endsWith(SUDO_HINT));
});

test("a run somebody stopped did not finish quietly", () => {
	// "finished without printing anything" for a run the reader killed reads as
	// a command that had nothing to say, not one that never got the chance.
	assert.equal(
		quietOutcome(["audit", "--fix"], { code: 0, signal: "SIGTERM" }),
		"`rcc audit --fix` was stopped before it printed anything.",
	);
	assert.equal(quietOutcome(["disk"], { code: 0, signal: null }), "`rcc disk` finished without printing anything.");
	assert.equal(quietOutcome(["disk"], undefined), "`rcc disk` finished without printing anything.");
});
