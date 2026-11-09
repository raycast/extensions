// The ranking is the app's file, copied. This fails when the two differ: run `npm run sync`.
// In the Raycast store repository the app is not there, so the check skips.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const APP_RANKING = "../../src/lib/ranking.ts";

test("src/ranking.ts is the app's ranking", { skip: !existsSync(APP_RANKING) }, () => {
  assert.equal(readFileSync("src/ranking.ts", "utf8"), readFileSync(APP_RANKING, "utf8"));
});
