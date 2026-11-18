import assert from "node:assert/strict";
import { test } from "node:test";
import { getHolidays } from "../src/api.ts";

test("Canadian holidays preserve their calendar dates in the local timezone", async () => {
  const year = new Date().getFullYear();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const requestedYear = Number(url.split("/").at(-2));
    return new Response(
      JSON.stringify([
        { date: `${requestedYear}-11-11`, name: "Remembrance Day" },
        { date: `${requestedYear}-12-25`, name: "Christmas Day" },
        { date: `${requestedYear + 1}-01-01`, name: "New Year's Day" },
      ]),
    );
  };
  try {
    const holidays = await getHolidays("CA");
    for (const [name, expectedYear, month, day] of [
      ["Remembrance Day", year, 11, 11],
      ["Christmas Day", year, 12, 25],
      ["New Year's Day", year + 1, 1, 1],
    ]) {
      const holiday = holidays.find((h) => h.name === name);
      assert.deepEqual(
        [holiday.date.getFullYear(), holiday.date.getMonth() + 1, holiday.date.getDate(), holiday.date.getHours()],
        [expectedYear, month, day, 0],
        `${name} must stay on its calendar date in ${process.env.TZ}`,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
