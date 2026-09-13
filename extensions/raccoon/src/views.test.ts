import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { COMMANDS } from "./commands.ts";

// views.tsx imports @raycast/api, which only resolves inside Raycast, so this
// reads the registry rather than importing it.
const source = readFileSync("src/views.tsx", "utf8");
const registry = source.slice(source.indexOf("const VIEWS"));
const viewed = new Set(
	[
		...registry
			.slice(0, registry.indexOf("};"))
			.matchAll(/^\t"?([a-z-]+)"?:/gm),
	].map((m) => m[1]),
);

/** The id a view is registered under, for a command of any shape. */
function viewKey(args: string[]): string {
	return args.join("-");
}

// Commands the launcher deliberately does not offer. Read from the same file
// that hides them, so removing one there without giving it a screen fails here.
const hidden = new Set(
	[
		...(
			source.match(/const HIDDEN = new Set\(\[([^\]]*)\]\)/)?.[1] ?? ""
		).matchAll(/"([a-z-]+)"/g),
	].map((m) => m[1]),
);

test("the registry was read, so an empty match cannot pass the check below", () => {
	assert.ok(viewed.size > 10, `read ${viewed.size} views`);
});

test("every command the CLI offers has a screen of its own", () => {
	// Anything without one falls through to RccDetail, which prints the command's
	// raw stdout. That is the wiring, not a report: `audit json` showed a reader
	// a JSON document, and `upgrade` showed thirty lines of progress protocol.
	const missing = COMMANDS.filter(
		(c) => !viewed.has(viewKey(c.args)) && !hidden.has(viewKey(c.args)),
	).map((c) => `rcc ${c.args.join(" ")}`);
	assert.deepEqual(missing, []);
});
