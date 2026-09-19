import assert from "node:assert/strict";
import test from "node:test";
import getScores from "./getScores";
import { requests } from "./test/axios";

test("requests each score date separately", async () => {
  await getScores({ league: "wnba" });

  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ dates }) => /^\d{8}$/.test(dates)));
  assert.ok(requests.every(({ url }) => url.endsWith("/wnba/scoreboard")));
});
