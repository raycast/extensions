import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  baselineDates,
  buildHours,
  dayTitle,
  hourProfiles,
  buildReport,
  compareToBaseline,
  coverageSummary,
  formatDuration,
  formatShare,
  usageLabel,
  hourLabel,
  heroMarkdown,
  peakHours,
  presenceLabel,
  peakHourLabel,
  rangeDates,
  rangeTitle,
  rankOf,
  type RangeDay,
} from "./report";
import type { DayFile } from "./types";

/** 14 Sep 2026, 10:30 local time. */
const NOW = new Date(2026, 8, 14, 10, 30, 0).getTime();

function day(
  date: string,
  apps: Record<string, { name: string; at: [number, number][] }>,
  idle?: [number, number][],
): RangeDay {
  const file: DayFile = { v: 1, date, apps: {} };
  if (idle) {
    const buckets = new Array<number>(24).fill(0);
    for (const [hour, seconds] of idle) buckets[hour] = seconds;
    file.idle = buckets;
  }
  for (const [key, app] of Object.entries(apps)) {
    const hours = new Array<number>(24).fill(0);
    for (const [hour, seconds] of app.at) hours[hour] = seconds;
    file.apps[key] = { name: app.name, hours };
  }
  return { date, file };
}

function blank(date: string): RangeDay {
  return { date, file: null };
}

function hoursWith(entries: [number, number][]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const [hour, seconds] of entries) hours[hour] = seconds;
  return hours;
}

describe("rangeDates", () => {
  it("returns a single key for today and yesterday", () => {
    assert.deepEqual(rangeDates("today", NOW), ["2026-09-14"]);
    assert.deepEqual(rangeDates("yesterday", NOW), ["2026-09-13"]);
  });

  it("returns an ascending span ending today", () => {
    const week = rangeDates("last7", NOW);
    assert.equal(week.length, 7);
    assert.equal(week[0], "2026-09-08");
    assert.equal(week[6], "2026-09-14");
  });

  it("crosses a month boundary without gaps", () => {
    const month = rangeDates("last30", NOW);
    assert.equal(month.length, 30);
    assert.equal(month[0], "2026-08-16");
    assert.equal(month[29], "2026-09-14");
    assert.equal(new Set(month).size, 30);
  });
});

describe("baselineDates", () => {
  it("covers the week before today, excluding today", () => {
    const base = baselineDates("today", NOW);
    assert.equal(base?.length, 7);
    assert.equal(base?.at(-1), "2026-09-13");
    assert.ok(!base?.includes("2026-09-14"));
  });

  it("covers the week before yesterday, excluding yesterday", () => {
    const base = baselineDates("yesterday", NOW);
    assert.equal(base?.at(-1), "2026-09-12");
    assert.ok(!base?.includes("2026-09-13"));
  });

  it("declines to compare a multi-day range against an overlapping week", () => {
    assert.equal(baselineDates("last7", NOW), null);
    assert.equal(baselineDates("last30", NOW), null);
  });
});

describe("buildReport", () => {
  it("ranks apps by time and computes share of the total", () => {
    const report = buildReport([
      day("2026-09-14", {
        "com.a": { name: "A", at: [[9, 600]] },
        "com.b": { name: "B", at: [[9, 1800]] },
      }),
    ]);

    assert.deepEqual(
      report.rows.map((r) => r.name),
      ["B", "A"],
    );
    assert.equal(report.totalSeconds, 2400);
    assert.equal(report.rows[0]?.share, 0.75);
    assert.equal(report.rows[1]?.share, 0.25);
  });

  it("merges the same app across days and keeps an hour-of-day profile", () => {
    const report = buildReport([
      day("2026-09-13", { "com.a": { name: "A", at: [[9, 600]] } }),
      day("2026-09-14", {
        "com.a": {
          name: "A",
          at: [
            [9, 300],
            [14, 120],
          ],
        },
      }),
    ]);

    const row = report.rows[0];
    assert.equal(row?.seconds, 1020);
    assert.equal(row?.hours[9], 900);
    assert.equal(row?.hours[14], 120);
    assert.equal(row?.activeDays, 2);
    assert.equal(report.daysWithData, 2);
  });

  it("lists every date the range asked for, including empty ones", () => {
    const report = buildReport([
      blank("2026-09-12"),
      day("2026-09-13", { "com.a": { name: "A", at: [[9, 600]] } }),
      day("2026-09-14", { "com.a": { name: "A", at: [[9, 300]] } }),
    ]);

    assert.deepEqual(report.dates, ["2026-09-12", "2026-09-13", "2026-09-14"]);
    assert.equal(report.rows[0]?.seconds, 900);
  });

  it("prefers the most recent display name after a rename", () => {
    const report = buildReport([
      day("2026-09-13", { "com.a": { name: "Old Name", at: [[9, 600]] } }),
      day("2026-09-14", { "com.a": { name: "New Name", at: [[9, 60]] } }),
    ]);
    assert.equal(report.rows[0]?.name, "New Name");
  });

  it("counts only days that recorded time", () => {
    const report = buildReport([
      blank("2026-09-12"),
      day("2026-09-13", {}),
      day("2026-09-14", { "com.a": { name: "A", at: [[9, 60]] } }),
    ]);
    assert.equal(report.daysWithData, 1);
    assert.equal(report.dates.length, 3);
  });

  it("survives a truncated or corrupt day file", () => {
    const broken: RangeDay = {
      date: "2026-09-14",
      file: { v: 1, date: "2026-09-14", apps: { "com.a": { name: "A", hours: [60, 30] } } } as DayFile,
    };
    const report = buildReport([broken, blank("2026-09-15")]);

    assert.equal(report.totalSeconds, 90);
    assert.equal(report.rows[0]?.hours.length, 24);
    assert.equal(report.rows[0]?.hours[0], 60);
  });

  it("drops apps with no recorded time rather than listing them at zero", () => {
    const report = buildReport([day("2026-09-14", { "com.a": { name: "A", at: [[9, 0]] } })]);
    assert.equal(report.rows.length, 0);
    assert.equal(report.totalSeconds, 0);
  });

  it("returns an empty report for an empty range", () => {
    const report = buildReport([]);
    assert.deepEqual(report.rows, []);
    assert.equal(report.totalSeconds, 0);
    assert.equal(report.daysWithData, 0);
  });
});

describe("formatDuration", () => {
  it("drops empty units", () => {
    assert.equal(formatDuration(7200), "2h");
    assert.equal(formatDuration(8040), "2h 14m");
    assert.equal(formatDuration(840), "14m");
    assert.equal(formatDuration(44), "44s");
    assert.equal(formatDuration(0), "0s");
  });

  it("never reports negative time", () => {
    assert.equal(formatDuration(-60), "0s");
  });
});

describe("formatShare", () => {
  it("never rounds real recorded time down to a flat zero", () => {
    assert.equal(formatShare(0.001), "<1%");
    assert.equal(formatShare(0.004), "<1%");
  });

  it("rounds normally in between", () => {
    assert.equal(formatShare(0.7), "70%");
    assert.equal(formatShare(0.985), "99%");
  });

  it("never rounds a near-total up to a flat hundred", () => {
    assert.equal(formatShare(0.998), ">99%");
    assert.equal(formatShare(1), "100%");
  });

  it("reports a true zero as zero", () => {
    assert.equal(formatShare(0), "0%");
    assert.equal(formatShare(Number.NaN), "0%");
  });
});

describe("usageLabel", () => {
  it("leads with the duration and follows with the share", () => {
    assert.equal(usageLabel(3600, 0.3), "1h · 30%");
    assert.equal(usageLabel(18, 0.004), "18s · <1%");
  });

  it("carries the near-total and total rules through", () => {
    assert.equal(usageLabel(3600, 0.998), "1h · >99%");
    assert.equal(usageLabel(3600, 1), "1h · 100%");
  });
});

describe("hourLabel", () => {
  it("reads as a 12-hour clock", () => {
    assert.equal(hourLabel(9), "9 AM");
    assert.equal(hourLabel(13), "1 PM");
    assert.equal(hourLabel(23), "11 PM");
  });

  it("calls midnight and noon 12, not 0", () => {
    assert.equal(hourLabel(0), "12 AM");
    assert.equal(hourLabel(12), "12 PM");
  });

  it("never emits a zero hour across the whole day", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      assert.match(hourLabel(hour), /^(1[0-2]|[1-9]) (AM|PM)$/);
    }
  });
});

describe("peakHours", () => {
  it("picks the busiest hour, not the first", () => {
    const hours = hoursWith([
      [9, 600],
      [10, 1200],
      [11, 300],
    ]);
    assert.deepEqual(peakHours(hours), { hours: [10], seconds: 1200 });
    assert.equal(peakHourLabel(hours), "10 AM · 20m");
  });

  it("returns every hour tied for the most time", () => {
    const hours = hoursWith([
      [9, 3600],
      [10, 3600],
      [11, 600],
    ]);
    assert.deepEqual(peakHours(hours), { hours: [9, 10], seconds: 3600 });
    assert.equal(peakHourLabel(hours), "9 AM, 10 AM · 1h");
  });

  it("drops earlier hours when a later one beats them", () => {
    const hours = hoursWith([
      [9, 600],
      [10, 600],
      [11, 1200],
    ]);
    assert.deepEqual(peakHours(hours), { hours: [11], seconds: 1200 });
  });

  it("summarises once too many hours tie to list", () => {
    const hours = hoursWith([
      [9, 3600],
      [10, 3600],
      [11, 3600],
      [14, 3600],
      [15, 3600],
    ]);
    assert.equal(peakHours(hours)?.hours.length, 5);
    assert.equal(peakHourLabel(hours), "9 AM, 10 AM, 11 AM +2 · 1h");
  });

  it("marks a multi-day figure as a total, since it can exceed an hour", () => {
    const hours = hoursWith([[10, 108000]]);
    assert.equal(peakHourLabel(hours), "10 AM · 30h");
    assert.equal(peakHourLabel(hours, true), "10 AM · 30h total");
  });

  it("returns null for an empty day", () => {
    assert.equal(peakHours(new Array<number>(24).fill(0)), null);
    assert.equal(peakHourLabel(new Array<number>(24).fill(0)), null);
  });
});

describe("rankOf", () => {
  it("is one-based and follows the sorted order", () => {
    const report = buildReport([
      day("2026-09-14", {
        "com.a": { name: "A", at: [[9, 600]] },
        "com.b": { name: "B", at: [[9, 1800]] },
      }),
    ]);
    assert.equal(rankOf(report, "com.b"), 1);
    assert.equal(rankOf(report, "com.a"), 2);
  });

  it("returns null for an app outside the range", () => {
    assert.equal(rankOf(buildReport([]), "com.a"), null);
  });
});

describe("compareToBaseline", () => {
  /** 30m on each of two tracked days; the other five days were never sampled. */
  function sparseWeek() {
    return buildReport([
      day("2026-09-08", { "com.a": { name: "A", at: [[10, 1800]] } }),
      day("2026-09-09", { "com.a": { name: "A", at: [[10, 1800]] } }),
      blank("2026-09-10"),
      blank("2026-09-11"),
      blank("2026-09-12"),
      blank("2026-09-13"),
      blank("2026-09-14"),
    ]);
  }

  it("averages over tracked days, not empty calendar days", () => {
    // 30m today is exactly what both tracked days held, so nothing has changed.
    // Dividing by seven calendar days instead would call this "250% above 8m".
    assert.equal(compareToBaseline(1800, sparseWeek(), "com.a"), "About average (30m)");
  });

  it("states a modest difference as a percentage", () => {
    assert.equal(compareToBaseline(2700, sparseWeek(), "com.a"), "50% above your 30m average");
    assert.equal(compareToBaseline(900, sparseWeek(), "com.a"), "50% below your 30m average");
  });

  it("states a large difference as a multiple, which cannot be misread", () => {
    assert.equal(compareToBaseline(5400, sparseWeek(), "com.a"), "3x your 30m average");
    assert.equal(compareToBaseline(9360, sparseWeek(), "com.a"), "5.2x your 30m average");
  });

  it("drops the decimal once the multiple is large", () => {
    assert.equal(compareToBaseline(1800 * 12, sparseWeek(), "com.a"), "12x your 30m average");
  });

  it("switches to a multiple exactly at 2x, not before", () => {
    assert.equal(compareToBaseline(3540, sparseWeek(), "com.a"), "97% above your 30m average");
    assert.equal(compareToBaseline(3600, sparseWeek(), "com.a"), "2x your 30m average");
  });

  it("says nothing when the baseline is too small for a ratio to mean anything", () => {
    // 18s a day: any comparison against it is noise.
    const tiny = buildReport([day("2026-09-13", { "com.a": { name: "A", at: [[10, 18]] } })]);
    assert.equal(compareToBaseline(1800, tiny, "com.a"), null);
  });

  it("says nothing when the app has no history to compare against", () => {
    assert.equal(compareToBaseline(1800, sparseWeek(), "com.unknown"), null);
  });

  it("says nothing when there is no prior week at all", () => {
    assert.equal(compareToBaseline(1800, null, "com.a"), null);
  });

  it("says nothing when the prior week recorded nothing", () => {
    const empty = buildReport([blank("2026-09-13"), blank("2026-09-14")]);
    assert.equal(compareToBaseline(1800, empty, "com.a"), null);
  });

  it("never opens with a symbol, which the metadata renderer mangles", () => {
    for (const seconds of [2700, 900, 1800]) {
      assert.match(compareToBaseline(seconds, sparseWeek(), "com.a") ?? "", /^[A-Za-z0-9]/);
    }
  });
});

describe("coverageSummary", () => {
  it("states what was tracked, leaving the range to the section title", () => {
    const report = buildReport([day("2026-09-14", { "com.a": { name: "A", at: [[9, 3600]] } })]);
    assert.equal(coverageSummary(report), "Tracked 1h across 1 app");
  });

  it("reports how many days of a span actually hold data", () => {
    const report = buildReport([
      day("2026-09-13", { "com.a": { name: "A", at: [[9, 3600]] } }),
      day("2026-09-14", { "com.b": { name: "B", at: [[9, 1800]] } }),
      blank("2026-09-15"),
    ]);
    assert.equal(coverageSummary(report), "Tracked 1h 30m across 2 apps, on 2 of 3 days");
  });

  it("has a sane empty state", () => {
    assert.equal(coverageSummary(buildReport([])), "Nothing tracked yet");
    assert.equal(coverageSummary(buildReport([]), true), "Nothing tracked yet");
  });

  it("drops the prose in compact form, for the narrow column", () => {
    const single = buildReport([day("2026-09-14", { "com.a": { name: "A", at: [[9, 3600]] } })]);
    assert.equal(coverageSummary(single, true), "1h · 1 app");

    const span = buildReport([
      day("2026-09-13", { "com.a": { name: "A", at: [[9, 3600]] } }),
      day("2026-09-14", { "com.b": { name: "B", at: [[9, 1800]] } }),
      blank("2026-09-15"),
    ]);
    assert.equal(coverageSummary(span, true), "1h 30m · 2 apps · 2/3 days");
  });

  it("keeps the compact form short enough for the narrow column", () => {
    const span = buildReport([
      day("2026-09-13", { "com.a": { name: "A", at: [[9, 36000]] } }),
      day("2026-09-14", { "com.b": { name: "B", at: [[9, 1800]] } }),
      blank("2026-09-15"),
    ]);
    assert.ok(coverageSummary(span, true).length <= 30, coverageSummary(span, true));
  });
});

describe("rangeTitle", () => {
  it("names each range", () => {
    assert.equal(rangeTitle("today"), "Today");
    assert.equal(rangeTitle("last7"), "Last 7 Days");
  });
});

describe("heroMarkdown", () => {
  it("renders the icon sized, with no heading beside it", () => {
    const md = heroMarkdown("/tmp/icons/arc.png", null, 96);
    assert.equal(md, "![](/tmp/icons/arc.png?raycast-width=96&raycast-height=96)");
  });

  it("stacks the chart beneath the icon", () => {
    const md = heroMarkdown("/tmp/icons/arc.png", "data:image/svg+xml;base64,QQ==", 96);
    assert.equal(
      md,
      "![](/tmp/icons/arc.png?raycast-width=96&raycast-height=96)\n\n![](data:image/svg+xml;base64,QQ==)",
    );
  });

  it("puts no sizing query on the chart, which a base64 payload cannot carry", () => {
    const md = heroMarkdown(null, "data:image/svg+xml;base64,QQ==");
    assert.equal(md, "![](data:image/svg+xml;base64,QQ==)");
    assert.doesNotMatch(md, /raycast-width/);
  });

  it("encodes a path containing spaces", () => {
    const md = heroMarkdown("/Users/x/Application Support/icons/arc.png", null);
    assert.match(md, /Application%20Support/);
    assert.doesNotMatch(md, /Application Support/);
  });

  it("renders nothing without either, so the panel can skip the markdown half", () => {
    assert.equal(heroMarkdown(null, null), "");
  });
});

describe("idle aggregation", () => {
  it("sums idle across days into an hour-of-day profile", () => {
    const report = buildReport([
      day("2026-09-13", { "com.a": { name: "A", at: [[9, 600]] } }, [[9, 300]]),
      day("2026-09-14", { "com.a": { name: "A", at: [[9, 600]] } }, [
        [9, 120],
        [14, 60],
      ]),
    ]);

    assert.equal(report.idleSeconds, 480);
    assert.equal(report.idleHours[9], 420);
    assert.equal(report.idleHours[14], 60);
  });

  it("reads a day file written before idle existed as unknown, not zero", () => {
    const report = buildReport([day("2026-09-14", { "com.a": { name: "A", at: [[9, 600]] } })]);
    assert.equal(report.idleSeconds, 0);
    assert.equal(report.idleHours.length, 24);
  });

  it("counts a day of pure idle as a day with data", () => {
    const report = buildReport([day("2026-09-14", {}, [[9, 600]])]);
    assert.equal(report.daysWithData, 1);
    assert.equal(report.idleSeconds, 600);
    assert.equal(report.rows.length, 0, "idle belongs to no application");
  });
});

describe("buildHours", () => {
  it("lists hours with the busiest app first inside each", () => {
    const report = buildReport([
      day("2026-09-14", {
        "com.a": {
          name: "A",
          at: [
            [9, 600],
            [14, 100],
          ],
        },
        "com.b": { name: "B", at: [[9, 1800]] },
      }),
    ]);

    const hours = buildHours(report);
    assert.deepEqual(
      hours.map((h) => h.hour),
      [9, 14],
    );
    assert.equal(hours[0]?.seconds, 2400);
    assert.deepEqual(
      hours[0]?.apps.map((a) => a.name),
      ["B", "A"],
    );
    assert.equal(hours[1]?.apps.length, 1);
  });

  it("keeps an hour that was only idle", () => {
    const report = buildReport([day("2026-09-14", { "com.a": { name: "A", at: [[9, 600]] } }, [[22, 900]])]);
    const hours = buildHours(report);

    assert.deepEqual(
      hours.map((h) => h.hour),
      [9, 22],
    );
    assert.equal(hours[1]?.seconds, 0);
    assert.equal(hours[1]?.idleSeconds, 900);
    assert.deepEqual(hours[1]?.apps, []);
  });

  it("omits hours with nothing at all, so a day stays readable", () => {
    const report = buildReport([day("2026-09-14", { "com.a": { name: "A", at: [[9, 600]] } })]);
    assert.equal(buildHours(report).length, 1);
  });

  it("returns nothing for an empty report", () => {
    assert.deepEqual(buildHours(buildReport([])), []);
  });
});

describe("presenceLabel", () => {
  it("pairs active time with idle time", () => {
    assert.equal(presenceLabel(21720, 7920), "6h 2m active · 2h 12m idle");
  });

  it("omits idle entirely when there was none", () => {
    assert.equal(presenceLabel(3600, 0), "1h active");
  });
});

describe("dayTitle", () => {
  const now = new Date(2026, 8, 15, 10, 30).getTime();

  it("names the two days people actually think in", () => {
    assert.equal(dayTitle("2026-09-15", now), "Today");
    assert.equal(dayTitle("2026-09-14", now), "Yesterday");
  });

  it("falls back to the date for anything older", () => {
    const title = dayTitle("2026-09-11", now);
    assert.notEqual(title, "Today");
    assert.notEqual(title, "Yesterday");
    assert.match(title, /11/, `expected the day of month in ${title}`);
  });

  it("returns a malformed key unchanged rather than inventing a date", () => {
    assert.equal(dayTitle("not-a-date", now), "not-a-date");
  });
});

describe("hourProfiles", () => {
  it("sums every app into one active profile and carries idle alongside", () => {
    const report = buildReport([
      day(
        "2026-09-14",
        {
          "com.a": { name: "A", at: [[9, 600]] },
          "com.b": {
            name: "B",
            at: [
              [9, 300],
              [14, 120],
            ],
          },
        },
        [[9, 60]],
      ),
    ]);

    const { active, idle } = hourProfiles(report);
    assert.equal(active[9], 900, "both apps in the nine o'clock hour");
    assert.equal(active[14], 120);
    assert.equal(idle[9], 60, "idle belongs to the machine, not to an app");
    assert.equal(active.length, 24);
  });

  it("returns empty profiles for a day with nothing recorded", () => {
    const { active, idle } = hourProfiles(buildReport([]));
    assert.equal(active.filter((v) => v > 0).length, 0);
    assert.equal(idle.filter((v) => v > 0).length, 0);
  });
});
