import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dayChartMarkdown, dayChartSvg, hourlyChartSvg, svgDataUri } from "./chart";

function hoursWith(entries: [number, number][]): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const [hour, seconds] of entries) hours[hour] = seconds;
  return hours;
}

const DARK = { appearance: "dark" as const };

describe("hourlyChartSvg", () => {
  it("draws one bar per recorded hour and none for the rest", () => {
    const svg = hourlyChartSvg(
      hoursWith([
        [9, 3600],
        [14, 1800],
      ]),
      DARK,
    );
    assert.equal(svg.match(/<rect/g)?.length, 2, "an empty hour reads as absence, not a stub");
  });

  it("scales bars against the busiest hour and highlights it", () => {
    const svg = hourlyChartSvg(
      hoursWith([
        [9, 3600],
        [14, 1800],
      ]),
      DARK,
    );
    const heights = [...svg.matchAll(/height="(\d+)"/g)].map((m) => Number(m[1]));
    assert.ok(heights[0]! > heights[1]!, "the busier hour is taller");
    assert.match(svg, /fill="#7FB0FF"/, "the peak uses the highlight colour");
  });

  it("gives a barely-used hour a visible sliver rather than nothing", () => {
    const svg = hourlyChartSvg(
      hoursWith([
        [9, 36000],
        [10, 1],
      ]),
      DARK,
    );
    const heights = [...svg.matchAll(/height="(\d+)"/g)].map((m) => Number(m[1]));
    assert.ok(heights[1]! >= 3, `expected a visible bar, got ${heights[1]}`);
  });

  it("keeps every bar inside the plot area", () => {
    const svg = hourlyChartSvg(hoursWith([[9, 3600]]), { ...DARK, height: 110 });
    for (const m of svg.matchAll(/y="([\d.]+)"/g)) {
      assert.ok(Number(m[1]) >= 0, "nothing may be drawn above the top edge");
    }
  });

  it("draws an axis and names four hours, without clipping the first", () => {
    const svg = hourlyChartSvg(hoursWith([[9, 3600]]), DARK);
    assert.equal(svg.match(/<text/g)?.length, 4);
    assert.match(svg, /text-anchor="start"[^>]*>12a</, "the midnight label is left-aligned to stay in frame");
    assert.match(svg, /<line /);
  });

  it("still draws the axis for a day with nothing recorded", () => {
    const svg = hourlyChartSvg(new Array<number>(24).fill(0), DARK);
    assert.equal(svg.match(/<rect/g), null);
    assert.match(svg, /<line /);
  });

  it("uses a different palette per appearance", () => {
    const hours = hoursWith([[9, 3600]]);
    assert.notEqual(hourlyChartSvg(hours, { appearance: "dark" }), hourlyChartSvg(hours, { appearance: "light" }));
  });

  it("declares its own size, since a data URI cannot carry a sizing query", () => {
    const svg = hourlyChartSvg(hoursWith([[9, 60]]), { ...DARK, width: 320, height: 110 });
    assert.match(svg, /width="320"/);
    assert.match(svg, /height="110"/);
    assert.match(svg, /viewBox="0 0 320 110"/);
  });
});

describe("svgDataUri", () => {
  it("base64 encodes, so quotes and hashes in the markup need no escaping", () => {
    const uri = svgDataUri('<svg fill="#fff"/>');
    assert.match(uri, /^data:image\/svg\+xml;base64,/);
    const payload = uri.slice("data:image/svg+xml;base64,".length);
    assert.equal(Buffer.from(payload, "base64").toString("utf8"), '<svg fill="#fff"/>');
    assert.doesNotMatch(payload, /[#"'<>]/);
  });
});

describe("dayChartSvg", () => {
  function data(active: [number, number][], idle: [number, number][] = []) {
    return { active: hoursWith(active), idle: hoursWith(idle) };
  }

  it("stacks idle above active in the same hour", () => {
    const svg = dayChartSvg(data([[9, 1800]], [[9, 900]]), DARK);
    assert.equal(svg.match(/<rect/g)?.length, 4, "two bar segments plus two legend swatches");
  });

  it("snaps the axis to a round duration rather than the exact peak", () => {
    assert.match(dayChartSvg(data([[9, 1700]]), DARK), />30m</, "1700s should top out at 30m");
    assert.match(dayChartSvg(data([[9, 2000]]), DARK), />1h</, "2000s should top out at 1h");
    assert.match(dayChartSvg(data([[9, 100]]), DARK), />5m</);
  });

  it("keeps the top axis label inside the frame", () => {
    const svg = dayChartSvg(data([[9, 1800]]), DARK);
    for (const m of svg.matchAll(/<text[^>]*y="([\d.]+)"/g)) {
      assert.ok(Number(m[1]) >= 7, `a label at y=${m[1]} would clip at the top edge`);
    }
  });

  it("dims every hour but the highlighted one", () => {
    const plain = dayChartSvg(
      data([
        [9, 1800],
        [14, 900],
      ]),
      DARK,
    );
    const picked = dayChartSvg(
      {
        ...data([
          [9, 1800],
          [14, 900],
        ]),
        highlight: 14,
      },
      DARK,
    );

    assert.doesNotMatch(plain, /opacity="0.55"/);
    assert.match(picked, /opacity="0.55"/);
  });

  it("names the axis hours in full and labels both series", () => {
    const svg = dayChartSvg(data([[9, 1800]], [[9, 60]]), DARK);
    for (const label of ["12 AM", "6 AM", "12 PM", "6 PM", "Active", "Idle"]) {
      assert.ok(svg.includes(`>${label}<`), `missing ${label}`);
    }
  });

  it("draws gridlines even when the day is empty", () => {
    const svg = dayChartSvg(data([]), DARK);
    assert.equal(svg.match(/<line/g)?.length, 3);
  });

  it("survives a bucket larger than a day, which a long range can produce", () => {
    const svg = dayChartSvg(data([[9, 200_000]]), DARK);
    assert.match(svg, /<rect/);
    assert.doesNotMatch(svg, /NaN|Infinity/);
  });
});

describe("dayChartMarkdown", () => {
  it("wraps the chart as a markdown image, not a bare data URI", () => {
    // A bare URI handed to a markdown prop renders as a wall of base64 text.
    const md = dayChartMarkdown({ active: hoursWith([[9, 1800]]), idle: hoursWith([]) }, DARK);
    assert.match(md, /^!\[\]\(data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+\)$/);
  });

  it("round-trips to the same svg the generator produced", () => {
    const data = { active: hoursWith([[9, 1800]]), idle: hoursWith([[9, 600]]) };
    const md = dayChartMarkdown(data, DARK);
    const payload = md.slice("![](data:image/svg+xml;base64,".length, -1);
    assert.equal(Buffer.from(payload, "base64").toString("utf8"), dayChartSvg(data, DARK));
  });
});

describe("dayChartSvg axis ceiling", () => {
  function data(active: [number, number][], idle: [number, number][] = []) {
    return { active: hoursWith(active), idle: hoursWith(idle) };
  }

  it("never offers a gridline above an hour, which no hour bucket can reach", () => {
    // Buckets creep past 3600s because a slice is filed under the hour it began in.
    const svg = dayChartSvg(data([[12, 3720]]), DARK);
    assert.match(svg, />1h</);
    assert.doesNotMatch(svg, />2h</);
  });

  it("clamps an over-full hour to the plot instead of raising the axis", () => {
    const svg = dayChartSvg(data([[12, 7200]]), { ...DARK, height: 150 });
    for (const m of svg.matchAll(/<rect[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/g)) {
      assert.ok(Number(m[1]) >= 0, `a bar starting at y=${m[1]} escapes the top`);
    }
  });

  it("keeps a stacked bar inside the plot when active and idle together overflow", () => {
    const svg = dayChartSvg(data([[12, 3600]], [[12, 3600]]), { ...DARK, height: 150 });
    for (const m of svg.matchAll(/<rect[^>]*y="([\d.]+)"/g)) {
      assert.ok(Number(m[1]) >= 0, `a stacked segment at y=${m[1]} escapes the top`);
    }
  });

  it("still scales down for a quiet day", () => {
    assert.match(dayChartSvg(data([[12, 240]]), DARK), />5m</);
  });
});
