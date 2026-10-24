import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Entry, Kimai } from "../src/api";
import { periodStarts, timeSummary } from "../src/summary";
const now = new Date(2026, 10, 1, 12); // Sunday: week crosses month boundary.
function entry(
  id: number,
  begin: Date,
  seconds: number,
  running = false,
): Entry {
  return {
    id,
    begin: begin.toISOString(),
    end: running
      ? null
      : new Date(begin.getTime() + seconds * 1000).toISOString(),
    duration: seconds,
    project: 1,
    activity: 1,
    description: "test",
  };
}
test("local periods, cross-month week, parallel active entries, deduplication and recorded duration", () => {
  const a = entry(1, new Date(2026, 10, 1, 11), 0, true);
  const rows = [
    a,
    a,
    entry(2, new Date(2026, 10, 1, 11, 30), 0, true),
    entry(3, new Date(2026, 9, 31, 10), 7200),
    entry(4, new Date(2026, 9, 25, 10), 3600),
    entry(5, new Date(2026, 10, 2, 10), 3600),
  ];
  assert.deepEqual(timeSummary(rows, now), {
    today: "1:30",
    yesterday: "2:00",
    week: "3:30",
    month: "1:30",
  });
  assert.equal(periodStarts(now).week.getDate(), 26);
  assert.deepEqual(timeSummary([], now), {
    today: "0:00",
    yesterday: "0:00",
    week: "0:00",
    month: "0:00",
  });
});
test("Sunday and Monday week boundaries and accumulated seconds", () => {
  assert.equal(periodStarts(new Date(2026, 9, 19, 12)).week.getDate(), 19);
  const rows = [
    entry(1, new Date(2026, 10, 1, 9), 31),
    entry(2, new Date(2026, 10, 1, 10), 31),
  ];
  assert.equal(timeSummary(rows, now).today, "0:01");
});
test("summary history fetches beyond one page and stops at period boundary", async () => {
  const calls: string[] = [];
  const api = new Kimai("https://test.example", "token", async (input) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify(
        calls.length === 1
          ? Array.from({ length: 500 }, (_, i) =>
              entry(i, new Date(2026, 10, 1, 9), 60),
            )
          : [
              entry(501, new Date(2026, 9, 31, 9), 60),
              entry(502, new Date(2026, 8, 1), 60),
            ],
      ),
    );
  });
  const rows = await api.historySince(new Date(2026, 9, 26));
  assert.equal(rows.length, 501);
  assert.equal(calls.length, 2);
});
test("exact full final page accepts terminal 404, but propagates other errors", async () => {
  for (const status of [404, 403]) {
    let count = 0;
    const api = new Kimai("https://test.example", "token", async () =>
      ++count === 1
        ? new Response(
            JSON.stringify(
              Array.from({ length: 500 }, (_, i) =>
                entry(i, new Date(2026, 10, 1, 9), 60),
              ),
            ),
          )
        : new Response("{}", { status }),
    );
    if (status === 404)
      assert.equal((await api.historySince(new Date(2026, 9, 26))).length, 500);
    else
      await assert.rejects(
        () => api.historySince(new Date(2026, 9, 26)),
        /403/,
      );
  }
});

test("yesterday remains separate when week and month start today", () => {
  const now = new Date(2026, 5, 1, 12);
  assert.deepEqual(
    timeSummary([entry(1, new Date(2026, 4, 31, 12), 7200)], now),
    { today: "0:00", yesterday: "2:00", week: "0:00", month: "0:00" },
  );
});
