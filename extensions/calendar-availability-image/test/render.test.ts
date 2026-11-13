import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseBusyEvents } from "../src/lib/ics";
import { buildPlan, rangeFor } from "../src/lib/plan";
import { svgToPng } from "../src/lib/png";
import { renderSvg } from "../src/lib/render";
import { BusyEvent, Options } from "../src/lib/types";
import { local, options, span } from "./helpers";

const NOW = new Date("2026-11-10T10:20:00+01:00");

function render(overrides: Partial<Options> = {}, events?: BusyEvent[], now = NOW) {
  const opts = options({ weeks: 2, ...overrides });
  const { start, end } = rangeFor(now, opts);
  const sample = readFileSync(join(process.cwd(), "test", "sample.ics"), "utf8");
  const weeks = buildPlan(events ?? parseBusyEvents(sample, start, end), now, opts);
  return { ...renderSvg(weeks, now, opts), weeks };
}

function slotLabels(svg: string): string[] {
  return [...svg.matchAll(/>(\d\d:\d\d) – (\d\d:\d\d)</g)].map((m) => `${m[1]}-${m[2]}`);
}

describe("renderSvg", () => {
  it("produces a complete SVG document", () => {
    const { svg } = render();
    assert.ok(svg.startsWith("<svg "));
    assert.ok(svg.endsWith("</svg>"));
    assert.equal(svg.match(/<text /g)?.length, svg.match(/<\/text>/g)?.length);
    assert.ok(!svg.includes("NaN"));
    assert.ok(!svg.includes("undefined"));
  });

  it("sizes the image by days, weeks and working hours", () => {
    assert.deepEqual([render().width, render().height], [1108, 1092]);
    assert.deepEqual([render({ weeks: 1 }).width, render({ weeks: 1 }).height], [1108, 610]);
    assert.equal(render({ includeWeekend: true }).width, 1158);
    assert.equal(render({ weeks: 1, startHour: 9, endHour: 17 }).height, 530);
  });

  it("labels every free slot with its time range", () => {
    const { svg, weeks } = render();
    const expected = weeks.flatMap((week) => week.flatMap((day) => day.free.map(span)));
    assert.equal(expected.length, 16);
    assert.deepEqual(slotLabels(svg), expected);
  });

  it("omits the label when a free slot is too small for it", () => {
    const events: BusyEvent[] = [
      {
        start: local(2026, 11, 11, 8, 15).getTime(),
        end: local(2026, 11, 11, 18, 0).getTime(),
        tentative: false,
        allDay: false,
      },
    ];
    const { svg, weeks } = render({ weeks: 1, minSlotMinutes: 15 }, events);
    assert.deepEqual(weeks[0][2].free.map(span), ["08:00-08:15"]);
    assert.ok(!slotLabels(svg).includes("08:00-08:15"));
  });

  it("never contains event titles", () => {
    const { svg } = render();
    for (const title of ["Gebucht", "Abwesend", "Feiertag", "Mit Vorbehalt", "Frei"]) {
      assert.ok(!svg.includes(title), title);
    }
  });

  it("labels the image in English", () => {
    const { svg } = render();
    assert.ok(svg.includes(">Availability<"));
    assert.ok(svg.includes(">Week 46<"));
    assert.ok(svg.includes(">busy<"));
  });

  it("labels the hours of the working day", () => {
    const { svg } = render({ weeks: 1, startHour: 9, endHour: 12 });
    assert.deepEqual(
      [...svg.matchAll(/>(\d\d:00)</g)].map((m) => m[1]),
      ["09:00", "10:00", "11:00", "12:00"],
    );
  });

  it("highlights only the current day", () => {
    const { svg } = render();
    assert.equal(svg.match(/font-weight="600" fill="#2563eb"/g)?.length, 1);
    assert.equal(render({}, undefined, local(2026, 11, 14, 10, 0)).svg.match(/fill="#2563eb"/g), null);
  });

  it("shows legend entries only for what is in the image", () => {
    const full = render().svg;
    assert.ok(full.includes(">tentative<"));
    assert.ok(full.includes(">past<"));

    const plain = render({ weeks: 1 }, [], local(2026, 11, 9, 7, 0)).svg;
    assert.ok(plain.includes(">free<"));
    assert.ok(plain.includes(">busy<"));
    assert.ok(!plain.includes(">tentative<"));
    assert.ok(!plain.includes(">past<"));
  });

  it("draws one block per busy, tentative and past interval", () => {
    const { svg, weeks } = render();
    const days = weeks.flat();
    const count = (fill: string) => svg.split(`fill="${fill}"/>`).length - 1;
    const total = (pick: (d: (typeof days)[number]) => number) => days.reduce((n, d) => n + pick(d), 0);
    // The hatch pattern and the legend each add one rectangle in the busy color.
    assert.equal(
      count("#c3c8d0") - 2,
      total((d) => d.busy.length),
    );
    assert.equal(
      count("url(#hatch)") - 1,
      total((d) => d.tentative.length),
    );
    assert.equal(
      count("#f3f4f6"),
      total((d) => (d.past ? 1 : 0)),
    );
  });
});

describe("renderSvg on a day with a daylight saving change", () => {
  it("places blocks on the local clock like the hour lines", () => {
    const event = { start: local(2026, 10, 25, 9).getTime(), end: local(2026, 10, 25, 10).getTime() };
    const { svg } = render(
      { weeks: 1, includeWeekend: true, startHour: 0, endHour: 24 },
      [{ ...event, tentative: false, allDay: false }],
      local(2026, 10, 19, 7),
    );
    assert.ok(svg.includes('<rect x="981" y="502" width="149" height="40" fill="#c3c8d0"/>'));
  });
});

describe("svgToPng", () => {
  it("renders a PNG at twice the SVG size", async () => {
    const { svg, width, height } = render({ weeks: 1 });
    const png = await svgToPng(svg, join(process.cwd(), "assets"));
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(png.readUInt32BE(16), width * 2);
    assert.equal(png.readUInt32BE(20), height * 2);
  });
});
