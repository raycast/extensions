import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { COMMANDS } from "./commands.ts";

// command-icons.ts imports @raycast/api, which only resolves inside Raycast, so
// this reads the map rather than importing it. The guarantee is the same one
// that matters: no command silently falls back to the shared icon.
// Read by path, not by import.meta: the project compiles to a module target
// that has no import.meta. The last test below fails if this read comes back
// empty, so a wrong path cannot make the coverage checks pass vacuously.
const source = readFileSync("src/command-icons.ts", "utf8");
const mapped = new Set(
	[...source.matchAll(/^\t"?([a-z-]+)"?:\s*Icon\./gm)].map((m) => m[1]),
);

test("every command the CLI offers has an icon of its own", () => {
	// commands.ts is regenerated from `rcc --help`. A command added there and
	// not here would fall back to the same dot as every other, which is the
	// state this map exists to end.
	assert.deepEqual(
		COMMANDS.filter((c) => !mapped.has(c.id)).map((c) => c.id),
		[],
	);
});

test("the map names nothing the CLI does not offer", () => {
	const ids = new Set(COMMANDS.map((c) => c.id));
	assert.deepEqual(
		[...mapped].filter((id) => !ids.has(id)),
		[],
	);
});

test("the map was read at all, so an empty match cannot pass the checks above", () => {
	assert.ok(mapped.size >= COMMANDS.length, `read ${mapped.size} entries`);
});
