import assert from "node:assert/strict";
import { test } from "node:test";
import { progressOf, progressBar, withoutProgress } from "./markdown.ts";
import { toMarkdown } from "./markdown.ts";

// Real output, as a user saw it in the extension: rcc's own progress protocol
// printed verbatim into the view because nothing on this side read it.
const UPGRADE = [
	"__RCC_PROGRESS__:0:30:Initializing...",
	"__RCC_PROGRESS__:1:30:brew: updating...",
	"==> Updating Homebrew...",
	"Already up-to-date.",
	"__RCC_PROGRESS__:7:30:npm: updating...",
].join("\n");

test("progress markers never reach the reader", () => {
	const out = toMarkdown(UPGRADE);
	assert.ok(!out.includes("__RCC_PROGRESS__"), out);
});

test("the real output around the markers is kept", () => {
	const out = toMarkdown(UPGRADE);
	assert.ok(out.includes("Already up-to-date."));
	assert.ok(out.includes("Updating Homebrew"));
});

test("the last marker is the state to show", () => {
	assert.deepEqual(progressOf(UPGRADE), {
		current: 7,
		total: 30,
		info: "npm: updating...",
	});
});

test("output with no markers reports no progress", () => {
	assert.equal(progressOf("just a report\nwith two lines"), undefined);
});

test("an info field containing colons survives whole", () => {
	assert.equal(
		progressOf("__RCC_PROGRESS__:1:2:pip: checking outdated...")?.info,
		"pip: checking outdated...",
	);
});

test("the bar shows how far along it is, and says so in numbers", () => {
	const bar = progressBar({ current: 15, total: 30, info: "npm" });
	assert.match(bar, /15\/30/);
	assert.equal((bar.match(/█/g) ?? []).length, 10);
	assert.equal((bar.match(/░/g) ?? []).length, 10);
});

test("a total of zero does not divide by zero", () => {
	assert.doesNotThrow(() => progressBar({ current: 0, total: 0, info: "x" }));
});

test("Copy Output hands over the report, not the protocol", () => {
	// The view already filtered these; the clipboard did not, which is how a
	// reader who had been shown a clean screen still pasted thirty lines of
	// __RCC_PROGRESS__ into a bug report.
	const copied = withoutProgress(UPGRADE);
	assert.ok(!copied.includes("__RCC_PROGRESS__"), copied);
	assert.ok(copied.includes("Already up-to-date."));
});
