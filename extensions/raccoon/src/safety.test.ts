import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * The extension's one promise: opening a screen changes nothing, and anything
 * that does change the machine is confirmed first.
 *
 * Checked against the source rather than the running views, which import
 * @raycast/api and only resolve inside Raycast. It is a coarse instrument - it
 * cannot tell a confirmation that is reached from one that is not - but it
 * catches the regression that actually happened: an action wired straight to a
 * command that changes a security setting, with no ask anywhere near it.
 */

const files = readdirSync("src").filter((f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith(".test.ts"));
/**
 * The code, with the comments taken out.
 *
 * Every rule here is a grep, and a grep cannot tell a call from a sentence
 * about a call: `// resolveRcc();` satisfied one of these until it was tried.
 * Prose is where these promises get explained, so prose is what has to go.
 */
function withoutComments(text: string): string {
	return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const source = new Map(files.map((f) => [f, withoutComments(readFileSync(`src/${f}`, "utf8"))]));

/** The body of `const <name> = async (...) => { ... };` at one indent level. */
function bodyOf(text: string, name: string): string {
	const start = text.indexOf(`const ${name} = async `);
	assert.notEqual(start, -1, `${name} is gone; this test needs rewriting`);
	const end = text.indexOf("\n\t};", start);
	assert.notEqual(end, -1, `could not find the end of ${name}`);
	return text.slice(start, end);
}

test("nothing runs a command in Terminal without asking first", () => {
	for (const [file, text] of source) {
		// terminal.ts is where it is defined; resolve.tsx is the one confirming
		// wrapper every list goes through.
		if (file === "terminal.ts") continue;
		if (!text.includes("runInTerminal(")) continue;
		assert.ok(text.includes("confirmAlert("), `${file} runs a command in Terminal with no confirmation in sight`);
	}
});

test("nothing writes the sudoers drop-in without asking first", () => {
	for (const [file, text] of source) {
		if (file === "sudoers.ts") continue;
		if (!/from "\.\/sudoers"/.test(text)) continue;
		assert.ok(text.includes("confirmAlert("), `${file} installs or removes a sudoers rule with no confirmation`);
	}
});

test("every way of applying an audit fix asks first", () => {
	const audit = source.get("audit.tsx");
	assert.ok(audit, "audit.tsx is gone");
	// Enter on a row, Cmd+Enter on everything shown, and the screen-level
	// action. All three reach a command that changes a security setting.
	for (const entry of ["fixOne", "fixAllVisible", "applyAllFixes"]) {
		assert.ok(bodyOf(audit, entry).includes("confirmAlert("), `${entry} applies a fix without asking`);
	}
});

test("both ways of changing the admin session ask first", () => {
	const admin = source.get("admin-session.tsx");
	assert.ok(admin, "admin-session.tsx is gone");
	// `enable` is behind two buttons - first install and re-apply - so the ask
	// belongs in it rather than on either one.
	for (const entry of ["enable", "disable"]) {
		assert.ok(bodyOf(admin, entry).includes("confirmAlert("), `${entry} changes sudo without asking`);
	}
});

test("a command handed to Terminal says so when Terminal refuses", () => {
	// osascript is asked to drive Terminal.app, and the first time a Mac does
	// that it puts up macOS's Automation prompt - which can be denied. An
	// unhandled rejection in an Action handler shows the reader nothing at all:
	// no success toast, no failure, the screen simply does not react.
	//
	// Coarse, like the rest of this file: it asks only that the call sits near
	// something that catches.
	for (const [file, text] of source) {
		if (file === "terminal.ts") continue;
		let from = 0;
		for (;;) {
			const at = text.indexOf("runInTerminal(", from);
			if (at === -1) break;
			const around = text.slice(Math.max(0, at - 400), at + 400);
			assert.ok(around.includes("catch"), `${file} hands a command to Terminal and ignores the refusal`);
			from = at + 1;
		}
	}
});

test("the export asks what rcc is before it runs anything", () => {
	// rcc 1.0.0 does not refuse `--export`, it ignores it: without the gate the
	// screen waits out a whole audit and then reports a file that was never
	// written. The order is the guarantee, so it is the order this checks.
	const text = source.get("audit-export.ts") ?? "";
	const body = text.slice(text.indexOf("export async function exportAudit"));
	const gate = body.indexOf("requireExportSupport()");
	const run = body.indexOf("runRcc(");
	assert.notEqual(gate, -1, "exportAudit no longer checks the version");
	assert.notEqual(run, -1, "exportAudit no longer runs rcc; this test needs rewriting");
	assert.ok(gate < run, "exportAudit runs rcc before checking the version it needs");
});

test("installing rcc ends by looking for it again", () => {
	// brew saying yes is not the same as this extension being able to find it:
	// discovery runs when a command starts, so a successful install has to send
	// the reader through discovery again rather than leave the screen as it was.
	const text = source.get("missing-rcc.tsx") ?? "";
	const outcome = text.indexOf("installOutcome(");
	const rediscover = text.indexOf("resolveRcc()", outcome);
	const relaunch = text.indexOf("launchCommand(", outcome);
	assert.ok(rediscover > outcome, "the install no longer looks for rcc again once brew is done");
	assert.ok(relaunch > rediscover, "the install no longer restarts the command after finding rcc");
});
