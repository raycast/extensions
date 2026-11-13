import assert from "node:assert/strict";
import { test } from "node:test";

import { excludeIgnoredVolumes, parseIgnoredVolumes } from "../src/ignored-volumes.ts";

const mounted = [
  { name: "Macintosh HD" },
  { name: "Recovery" },
  { name: "My Other Important Drive" },
  { name: "USB Drive" },
];

test("a comma-separated list with spaces hides every named volume", () => {
  const left = excludeIgnoredVolumes(mounted, "Macintosh HD, Recovery");
  assert.deepEqual(
    left.map((volume) => volume.name),
    ["My Other Important Drive", "USB Drive"],
  );
});

test("spaces around commas are removed and spaces inside a name are kept", () => {
  assert.deepEqual(parseIgnoredVolumes("My Other Important Drive, USB Drive"), [
    "My Other Important Drive",
    "USB Drive",
  ]);
});

test("a list without spaces around commas still hides those volumes", () => {
  const left = excludeIgnoredVolumes(mounted, "Macintosh HD,My Other Important Drive,USB Drive");
  assert.deepEqual(
    left.map((volume) => volume.name),
    ["Recovery"],
  );
});

test("a blank preference hides nothing", () => {
  assert.deepEqual(excludeIgnoredVolumes(mounted, undefined), mounted);
  assert.deepEqual(excludeIgnoredVolumes(mounted, ""), mounted);
  assert.deepEqual(excludeIgnoredVolumes(mounted, "   "), mounted);
  assert.deepEqual(parseIgnoredVolumes(null), []);
});
