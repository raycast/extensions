import assert from "node:assert/strict";
import test from "node:test";

import { parseCronExpression } from "../src/cronParser";

test("describes a five-part cron expression", () => {
  const result = parseCronExpression("0 2 3 4 5");

  assert.equal(
    result.explanation,
    "At 02:00 AM, on day 3 of the month, and on Friday, only in April",
  );
  assert.deepEqual(
    result.fields.map(({ label, value }) => [label, value]),
    [
      ["Minute", "0"],
      ["Hour", "2"],
      ["Day of Month", "3"],
      ["Month", "4"],
      ["Day of Week", "5"],
    ],
  );
});

test("describes cron nicknames", () => {
  assert.equal(parseCronExpression("@daily").explanation, "At 12:00 AM");
});

test("throws a useful error for empty expressions", () => {
  assert.throws(() => parseCronExpression(""), /Enter a cron expression/);
});

test("throws a useful error for invalid expressions", () => {
  assert.throws(() => parseCronExpression("1 2 3"), /Invalid cron expression/);
});
