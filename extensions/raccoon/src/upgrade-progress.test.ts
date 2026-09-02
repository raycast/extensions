import assert from "node:assert/strict";
import { test } from "node:test";
import { managersFrom } from "./upgrade-progress.ts";

// Real output, pasted from the extension by a reader who saw all of it raw.
const RUN = [
	"__RCC_PROGRESS__:0:30:Initializing...",
	"__RCC_PROGRESS__:0:30:brew: checking...",
	"__RCC_PROGRESS__:1:30:brew: updating...",
	"==> Updating Homebrew...",
	"Already up-to-date.",
	"__RCC_PROGRESS__:3:30:pip: checking...",
	"__RCC_PROGRESS__:5:30:pip: up to date",
	"pip: no outdated packages",
	"__RCC_PROGRESS__:7:30:npm: updating...",
	"changed 134 packages in 3s",
	"__RCC_PROGRESS__:9:30:pnpm: checking...",
	"pnpm: not installed",
	"__RCC_PROGRESS__:11:30:bun: checking...",
	"bun: not installed",
].join("\n");

test("one row per package manager, in the order rcc reached them", () => {
	assert.deepEqual(
		managersFrom(RUN).map((m) => m.name),
		["brew", "pip", "npm", "pnpm", "bun"],
	);
});

test("the last thing said about a manager is its state", () => {
	const byName = Object.fromEntries(
		managersFrom(RUN).map((m) => [m.name, m]),
	);
	assert.equal(byName.brew.state, "updating");
	assert.equal(byName.pip.state, "done");
	assert.equal(byName.npm.state, "updating");
});

test("a manager that is not installed is not a failure, and says so", () => {
	const byName = Object.fromEntries(
		managersFrom(RUN).map((m) => [m.name, m]),
	);
	assert.equal(byName.pnpm.state, "absent");
	assert.equal(byName.bun.state, "absent");
});

test("the plain output between markers belongs to the manager running then", () => {
	const byName = Object.fromEntries(
		managersFrom(RUN).map((m) => [m.name, m]),
	);
	assert.match(byName.brew.log, /Already up-to-date/);
	assert.match(byName.npm.log, /changed 134 packages/);
	// "Initializing..." precedes every manager and belongs to none.
	assert.ok(!byName.brew.log.includes("Initializing"));
});

test("output with no markers yields no rows rather than one empty one", () => {
	assert.deepEqual(managersFrom("just some text\nand more"), []);
});
