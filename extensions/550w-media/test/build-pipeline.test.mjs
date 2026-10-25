import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("regional fresh builds generate native preference declarations before typecheck", () => {
  const pipeline = new URL("../build-regions.mjs", import.meta.url);
  if (!existsSync(pipeline)) return; // Standalone Store source has no regional orchestrator.
  const source = readFileSync(pipeline, "utf8");
  assert.ok(
    source.indexOf("['run','build']") < source.indexOf("['run','typecheck']"),
  );
  assert.match(source, /region==='global'.*metadata/);
});
