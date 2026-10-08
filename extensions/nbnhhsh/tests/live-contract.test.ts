import assert from "node:assert/strict";
import { test } from "node:test";
import { createLookupClient } from "../src/lib/lookup";

test("hosted API supports anonymous batch lookups through the actual client", async () => {
  const groups = await createLookupClient().lookup("YYDS nsdd nbnhhshzzzzzz", new AbortController().signal);
  assert.deepEqual(
    groups.map((group) => group.name),
    ["yyds", "nsdd", "nbnhhshzzzzzz"],
  );
  assert.ok(groups[0].meanings.length > 0);
  assert.ok(groups[1].meanings.length > 0);
  assert.equal(groups[2].kind, "none");
});
