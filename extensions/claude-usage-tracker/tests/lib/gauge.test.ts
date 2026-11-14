import { describe, expect, it } from "vitest";
import { CELL_WIDTH, arcPath, escapeXml, gaugeMarkdown, gaugeRowSvg } from "../../src/lib/gauge";
import { windowGauge } from "../../src/lib/limits";
import { LimitWindow } from "../../src/lib/types";

const spec = { percent: 98, severity: "ok" as const, caption: "left", title: "Weekly", subtitle: "Resets in 6d 11h" };

describe("gauge SVG", () => {
  it("lays gauges side by side", () => {
    const svg = gaugeRowSvg([spec, { ...spec, title: "Opus only" }, spec], "dark");
    expect(svg).toContain(`width="${CELL_WIDTH * 3}"`);
    expect(svg.match(/<g transform/g)).toHaveLength(3);
    expect(svg).toContain(">98%<");
    expect(svg).toContain("#30D158");
  });

  it("omits the value arc at 0% and draws the time ring", () => {
    const empty = gaugeRowSvg([{ ...spec, percent: 0, time: 50 }], "light");
    // Track + inner time track + time arc, but no value arc.
    expect(empty.match(/<path/g)).toHaveLength(3);
    expect(empty).toContain("#C96442");
  });

  it("escapes text from profile data", () => {
    expect(escapeXml(`<a & "b">`)).toBe("&lt;a &amp; &quot;b&quot;&gt;");
    expect(gaugeRowSvg([{ ...spec, title: "A&B <x>" }], "dark")).toContain("A&amp;B &lt;x&gt;");
  });

  it("uses a large-arc flag only past half the sweep", () => {
    expect(arcPath(100, 100, 50, 0.5)).toContain(" 0 0 1 ");
    expect(arcPath(100, 100, 50, 1)).toContain(" 0 1 1 ");
  });

  it("embeds as a base64 data URI with readable alt text", () => {
    const md = gaugeMarkdown([spec], "dark");
    expect(md.startsWith("![Weekly 98% left](data:image/svg+xml;base64,")).toBe(true);
    const svg = Buffer.from(md.split("base64,")[1].slice(0, -1), "base64").toString("utf8");
    expect(svg.startsWith("<svg")).toBe(true);
  });
});

describe("windowGauge", () => {
  const resetsAt = new Date("2026-11-14T07:00:00Z");
  const now = new Date(resetsAt.getTime() - (10080 * 60_000 - 12.4 * 3_600_000));
  const window = (usedPercent: number): LimitWindow => ({
    id: "w",
    title: "Weekly",
    usedPercent,
    resetsAt,
    windowMinutes: 10080,
  });

  it("shows remaining with the time ring on the same scale", () => {
    expect(windowGauge(window(2), "remaining", now)).toMatchObject({ percent: 98, caption: "left", time: 93, timeLabel: "93% of time left" });
    expect(windowGauge(window(2), "used", now)).toMatchObject({ percent: 2, caption: "used", time: 7, timeLabel: "7% of time elapsed" });
  });

  it("warns in the subtitle when the limit runs out before the reset", () => {
    expect(windowGauge(window(2), "remaining", now).subtitle).toBe("Resets in 6d 11h");
    expect(windowGauge(window(50), "remaining", now).subtitle).toMatch(/^Runs out in 12h/);
  });

  it("drops the title and shrinks in the compact layout, keeping the ring legend", () => {
    const spec = { percent: 82, severity: "ok" as const, caption: "left", title: "Weekly", timeLabel: "52% of time left", time: 52 };
    const full = gaugeRowSvg([spec], "dark");
    const compact = gaugeRowSvg([spec], "dark", true);
    expect(full).toContain(">Weekly<");
    expect(compact).not.toContain(">Weekly<");
    expect(compact).toContain("52% of time left");
    expect(compact).toContain('height="214"');
  });
});
