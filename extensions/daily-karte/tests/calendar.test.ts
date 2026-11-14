import test from "node:test";
import assert from "node:assert/strict";
import { createEntry, DEFAULT_CARDS, summarizeWeek } from "daily-karte";
import { calendarSVG, calendarImage } from "../src/lib/calendar";

test("The weekly calendar renders seven days, timed blocks, untimed markers, and overlaps.", () => {
  const end = new Date(2026, 10, 10, 10).getTime();
  const entries = [
    createEntry(DEFAULT_CARDS[0], { end, duration: 60 }),
    createEntry(DEFAULT_CARDS[1], { end, duration: 30 }),
    createEntry(DEFAULT_CARDS[2], { end, duration: null }),
  ];
  const summary = summarizeWeek(entries, "2026-11-14");
  const svg = calendarSVG(summary, "2026-11-14", false);
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) assert.ok(svg.includes(day));
  assert.ok(svg.includes("Breakfast"));
  assert.ok(svg.includes("<circle"));
  assert.ok(svg.includes(">+</text>"));
  assert.ok(svg.includes("09:00"));
  assert.ok(!svg.includes("NaN"));
  assert.equal(summary.count, 3);
  const image = calendarImage(summary, "2026-11-14", false);
  assert.equal(Buffer.from(image.split(",")[1], "base64").toString(), svg);
});

test("Calendar labels cannot inject SVG elements or attributes.", () => {
  const card = { ...DEFAULT_CARDS[0], name: '<image href="evil"/>' };
  const summary = summarizeWeek([createEntry(card, { end: new Date(2026, 10, 10, 10).getTime() })], "2026-11-14");
  const svg = calendarSVG(summary, "2026-11-14", true);
  assert.ok(svg.includes("&lt;image href=&quot;evil&quot;/&gt;"));
  assert.ok(!svg.includes("<image"));
  assert.ok(!svg.includes("<script"));
});

test("An empty calendar remains a valid full-day grid in both appearances.", () => {
  const summary = summarizeWeek([], "2026-11-14");
  for (const dark of [true, false]) {
    const svg = calendarSVG(summary, "2026-11-14", dark);
    assert.ok(svg.includes("00:00"));
    assert.ok(svg.includes("24:00"));
    assert.ok(svg.endsWith("</g></svg>"));
    assert.ok(!svg.includes("NaN"));
    assert.ok(!svg.includes("<circle"));
  }
});

test("The full week fits within a compact image even with records spanning midnight through late evening.", () => {
  const summary = summarizeWeek(
    [
      createEntry(DEFAULT_CARDS[0], {
        end: new Date(2026, 10, 10, 0, 30).getTime(),
        duration: 60,
      }),
      createEntry(DEFAULT_CARDS[1], {
        end: new Date(2026, 10, 14, 23, 30).getTime(),
        duration: 60,
      }),
    ],
    "2026-11-14",
  );
  const svg = calendarSVG(summary, "2026-11-14", false);
  const height = Number(svg.match(/<svg[^>]*height="([\d.]+)"/)![1]);
  assert.ok(height <= 340);
  assert.ok(svg.includes("00:00"));
  assert.ok(svg.includes("24:00"));
  assert.ok(svg.includes("Nov 9"));
  assert.ok(svg.includes("Nov 15"));
  for (const match of svg.matchAll(/<text[^>]*y="([\d.]+)"/g)) assert.ok(Number(match[1]) < height);
});

test("The calendar keeps shared half-hour geometry across the daylight-saving transition.", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Berlin";
  try {
    const summary = summarizeWeek(
      [
        createEntry(DEFAULT_CARDS[0], {
          end: new Date(2026, 2, 29, 4).getTime(),
          duration: 120,
        }),
      ],
      "2026-03-29",
    );
    assert.equal(summary.blocks[6].slots[4].availableMinutes, 0);
    const svg = calendarSVG(summary, "2026-03-29", false);
    assert.ok(svg.includes("Breakfast"));
    assert.ok(svg.includes("Sun •"));
    assert.ok(!svg.includes("NaN"));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
