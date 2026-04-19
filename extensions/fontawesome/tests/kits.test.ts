import assert from "node:assert/strict";
import test from "node:test";

import { filterKits, findKitByToken } from "../src/utils/kits.ts";

test("filters kits by token or exact name without relying on an id field", () => {
  const kits = [
    { name: "Combined Kit", token: "combined-kit" },
    { name: "Breville Sage Icons", token: "breville-icons" },
  ];

  assert.deepEqual(filterKits(kits, "combined-kit"), [{ name: "Combined Kit", token: "combined-kit" }]);
  assert.deepEqual(filterKits(kits, "Breville Sage Icons"), [{ name: "Breville Sage Icons", token: "breville-icons" }]);
});

test("findKitByToken resolves kits using the schema-backed token field", () => {
  const kits = [
    { name: "Combined Kit", token: "combined-kit" },
    { name: "Breville Sage Icons", token: "breville-icons" },
  ];

  assert.deepEqual(findKitByToken(kits, "breville-icons"), { name: "Breville Sage Icons", token: "breville-icons" });
  assert.equal(findKitByToken(kits, "missing-kit"), undefined);
});
