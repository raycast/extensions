import assert from "node:assert/strict";
import test from "node:test";

import { resolveNamedItem } from "./name-resolution";

const spaces = [
  { id: "coastal", name: "Coastal Airport" },
  { id: "cafe", name: "Café at Night" },
  { id: "cabin", name: "Calm Cabin" },
  { id: "camp", name: "Calm Campsite" },
];

test("resolves names case-insensitively and ignores punctuation only when unique", () => {
  assert.equal(resolveNamedItem("coastal airport", spaces, "space").id, "coastal");
  assert.equal(resolveNamedItem("cafe-at-night", spaces, "space").id, "cafe");
  assert.equal(
    resolveNamedItem("lofi", [{ id: "lo-fi", name: "Lo-fi Hip-Hop" }], "background music track").id,
    "lo-fi",
  );
});

test("accepts only a unique normalized prefix and never an arbitrary substring", () => {
  assert.equal(resolveNamedItem("coastal", spaces, "space").id, "coastal");
  assert.throws(() => resolveNamedItem("calm", spaces, "space"), /ambiguous.*Calm Cabin, Calm Campsite/s);
  assert.throws(() => resolveNamedItem("airport", spaces, "space"), /No space named/);
  assert.throws(() => resolveNamedItem("ca", spaces, "space"), /No space named/);
});

test("rejects blank, unavailable, and unknown choices with useful available names", () => {
  assert.throws(() => resolveNamedItem("", spaces, "space"), /Available choices: Coastal Airport/);
  assert.throws(() => resolveNamedItem("Ocean", [], "space"), /No spaces are currently available/);
  assert.throws(() => resolveNamedItem("Ocean", spaces, "space"), /Available choices: Coastal Airport/);
});

test("rejects duplicate exact and normalized names instead of guessing", () => {
  assert.throws(
    () =>
      resolveNamedItem(
        "Rain Room",
        [
          { id: "one", name: "Rain Room" },
          { id: "two", name: "rain room" },
        ],
        "space",
      ),
    /matches multiple spaces/,
  );
  assert.throws(
    () =>
      resolveNamedItem(
        "lofi",
        [
          { id: "one", name: "Lo-fi" },
          { id: "two", name: "Lo Fi" },
        ],
        "background music track",
      ),
    /matches multiple background music tracks/,
  );
});
