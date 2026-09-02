import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { getLocalDateKey, parseValidDate } from "../src/lib/date.ts";

test("rejects invalid timestamps", () => {
  assert.equal(parseValidDate("not-a-date"), null);
  assert.equal(getLocalDateKey("not-a-date"), null);
});

test("buckets timestamps by local day in separate timezones", () => {
  const script = [
    'import { getLocalDateKey } from "./src/lib/date.ts";',
    'process.stdout.write(getLocalDateKey("2026-08-23T22:30:00.000Z") || "null");',
  ].join("\n");
  const run = (timezone: string) =>
    spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", script],
      {
        cwd: process.cwd(),
        env: { ...process.env, TZ: timezone },
        encoding: "utf8",
      },
    );

  const positive = run("Asia/Karachi");
  const negative = run("America/Los_Angeles");
  assert.equal(positive.status, 0, positive.stderr);
  assert.equal(negative.status, 0, negative.stderr);
  assert.equal(positive.stdout, "2026-08-24");
  assert.equal(negative.stdout, "2026-08-23");
});

test("formats Date objects with the same local key rule", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Asia/Karachi";
  try {
    assert.equal(
      getLocalDateKey(new Date("2026-08-23T22:30:00.000Z")),
      "2026-08-24",
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
