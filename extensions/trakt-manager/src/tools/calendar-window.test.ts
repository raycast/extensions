import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarWindow,
  EPISODES_FAILED_WARNING,
  inWindow,
  MOVIES_FAILED_WARNING,
  parseStartDate,
  resolveDays,
  settleCalendarHalves,
  toLocalAiring,
  toTraktQuery,
} from "./calendar-window";
import { toCompactCalendarEpisode, toCompactCalendarMovie } from "./compact-media";

const PARIS = "Europe/Paris";

function episode(firstAired: string | null) {
  return {
    first_aired: firstAired,
    episode: { season: 2, number: 3, title: "Who Is Alive?", ids: { trakt: 3959823 } },
    show: { title: "Severance", year: 2022, ids: { trakt: 154784 } },
  };
}

test("a late-night UTC airing lands on the next local day in Paris", () => {
  assert.deepEqual(toLocalAiring("2026-10-07T23:30:00.000Z", PARIS), { localDate: "2026-10-08", localTime: "01:30" });
});

test("the same UTC hour is an hour earlier locally after the 25 October 2026 DST change", () => {
  assert.deepEqual(toLocalAiring("2026-10-24T20:00:00.000Z", PARIS), { localDate: "2026-10-24", localTime: "22:00" });
  assert.deepEqual(toLocalAiring("2026-10-26T20:00:00.000Z", PARIS), { localDate: "2026-10-26", localTime: "21:00" });
});

test("the Trakt query covers the whole local window, one UTC day wider", () => {
  // Paris is ahead of UTC: 8 October 00:00 local is 7 October 22:00 UTC.
  assert.deepEqual(toTraktQuery(calendarWindow("2026-10-08", 7, PARIS)), { startDate: "2026-10-07", days: 8 });
  // 32 local days across the DST change still fit Trakt's 33-day cap.
  assert.deepEqual(toTraktQuery(calendarWindow("2026-10-08", 32, PARIS)), { startDate: "2026-10-07", days: 33 });
  // No offset, no extra day.
  assert.deepEqual(toTraktQuery(calendarWindow("2026-10-08", 7, "UTC")), { startDate: "2026-10-08", days: 7 });
});

test("an airing just outside the local window is left out", () => {
  const window = calendarWindow("2026-10-08", 7, PARIS);
  assert.equal(window.endDate, "2026-10-14");
  // 7 October 21:30 UTC is 23:30 on the 7th in Paris: before the window, though inside the UTC query.
  const before = toCompactCalendarEpisode(episode("2026-10-07T21:30:00.000Z"), PARIS);
  assert.equal(before && inWindow(before.localDate, window), false);
  // 14 October 22:30 UTC is 00:30 on the 15th in Paris: after the window.
  const after = toCompactCalendarEpisode(episode("2026-10-14T22:30:00.000Z"), PARIS);
  assert.equal(after && inWindow(after.localDate, window), false);
  const inside = toCompactCalendarEpisode(episode("2026-10-07T22:30:00.000Z"), PARIS);
  assert.equal(inside && inWindow(inside.localDate, window), true);
});

test("an episode without first_aired is skipped", () => {
  assert.equal(toCompactCalendarEpisode(episode(null), PARIS), undefined);
});

test("a movie release date is kept as is, with no time zone conversion", () => {
  const movie = { released: "2026-10-09", movie: { title: "Dune: Part Three", year: 2026, ids: { trakt: 900001 } } };
  assert.deepEqual(toCompactCalendarMovie(movie), {
    releaseDate: "2026-10-09",
    title: "Dune: Part Three",
    year: 2026,
    traktId: 900001,
  });
});

test("an invalid startDate throws instead of falling back to today", () => {
  for (const input of ["2026-13-01", "2026-02-30", "demain", "08/10/2026"]) {
    assert.throws(() => parseStartDate(input, PARIS), /startDate/);
  }
  assert.equal(parseStartDate("2026-10-20", PARIS), "2026-10-20");
  // Default: today in the given time zone (23:30 UTC on the 7th is already the 8th in Paris).
  assert.equal(parseStartDate(undefined, PARIS, Date.parse("2026-10-07T23:30:00.000Z")), "2026-10-08");
});

test("days defaults to 7, is capped at 32, and rejects anything but a whole number of at least 1", () => {
  assert.deepEqual(resolveDays(undefined), { days: 7, capped: false });
  assert.deepEqual(resolveDays(14), { days: 14, capped: false });
  assert.deepEqual(resolveDays(40), { days: 32, capped: true });
  assert.throws(() => resolveDays(0), /days/);
  assert.throws(() => resolveDays(1.5), /days/);
});

test("all: a failed half still returns the other with a warning", () => {
  const error = new Error("HTTP 500");
  assert.deepEqual(
    settleCalendarHalves("all", { status: "fulfilled", value: ["S02E03"] }, { status: "rejected", reason: error }),
    { episodes: ["S02E03"], movies: [], warning: MOVIES_FAILED_WARNING },
  );
  assert.deepEqual(
    settleCalendarHalves("all", { status: "rejected", reason: error }, { status: "fulfilled", value: ["Dune"] }),
    { episodes: [], movies: ["Dune"], warning: EPISODES_FAILED_WARNING },
  );
});

test("an explicit type, or both halves failing, throws", () => {
  const error = new Error("HTTP 500");
  assert.throws(
    () => settleCalendarHalves("all", { status: "rejected", reason: error }, { status: "rejected", reason: error }),
    error,
  );
  assert.throws(
    () => settleCalendarHalves("shows", { status: "rejected", reason: error }, { status: "fulfilled", value: [] }),
    error,
  );
  assert.throws(
    () => settleCalendarHalves("movies", { status: "fulfilled", value: [] }, { status: "rejected", reason: error }),
    error,
  );
});
