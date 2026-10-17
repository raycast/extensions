import { describe, expect, it } from "vitest";
import { renderCalendarSvg } from "./calendar-image";
import { LANGUAGES } from "./locales";
import { renderPickerSvg } from "./picker-image";
import { escapeXml, estimateTextWidth, fitText, IMAGE_HEIGHT, IMAGE_WIDTH, text, toDataUri } from "./svg";

const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);

describe("renderCalendarSvg", () => {
  const options = {
    selected: new Date(2026, 9, 21),
    today: new Date(2026, 9, 15),
    weekStartsOn: 0 as const,
    language: LANGUAGES.en,
    dark: false,
    output: { text: "2026-10-21", isError: false },
  };

  it("draws the title, weekday header and 42 days at the fixed size", () => {
    const svg = renderCalendarSvg(options);
    expect(svg).toContain(`width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}"`);
    const texts = textOf(svg);
    expect(texts[0]).toBe("October 2026");
    expect(texts[1]).toBe("2026-10-21");
    expect(texts.slice(2, 9)).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    expect(texts).toHaveLength(2 + 7 + 42);
  });

  it("adds a week-number column only when requested", () => {
    const texts = textOf(renderCalendarSvg({ ...options, weekStartsOn: 1, weekNumbering: "iso" }));
    expect(texts[2]).toBe("Wk");
    expect(texts).toContain("42");
    expect(texts).toHaveLength(2 + 8 + 6 + 42);
  });

  it("shortens a long output so it does not reach the title", () => {
    const long = "Thursday, October 21st, 2026 — a very long custom format that keeps going";
    const output = textOf(renderCalendarSvg({ ...options, output: { text: long, isError: false } }))[1];
    expect(output.endsWith("…")).toBe(true);
    expect(output.length).toBeLessThan(long.length);
  });

  it("draws format errors in the error color", () => {
    const svg = renderCalendarSvg({ ...options, output: { text: "Invalid date format", isError: true } });
    expect(svg).toContain('fill="#D93636">Invalid date format</text>');
  });

  it("highlights the selected day once", () => {
    expect(renderCalendarSvg(options).match(/<rect /g)).toHaveLength(1);
  });
});

describe("renderPickerSvg", () => {
  it("draws a heading and twelve cells", () => {
    const cells = Array.from({ length: 12 }, (_, i) => ({
      label: String(2019 + i),
      isSelected: i === 7,
      isCurrent: i === 7,
      isOutside: i === 0 || i === 11,
    }));
    const texts = textOf(renderPickerSvg("2020 – 2029", cells, true));
    expect(texts).toEqual(["2020 – 2029", ...cells.map((cell) => cell.label)]);
  });
});

describe("toDataUri", () => {
  it("encodes SVG as base64", () => {
    const uri = toDataUri("<svg/>");
    expect(uri).toBe(`data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`);
  });
});

describe("escapeXml", () => {
  it("escapes markup characters in text", () => {
    expect(escapeXml(`a & <b> "c" 'd'`)).toBe("a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;");
    expect(text(0, 0, "Q&A")).toContain(">Q&amp;A</text>");
  });
});

describe("fitText", () => {
  it("keeps text that fits and shortens text that does not", () => {
    expect(fitText("2026-10-21", 16, 200)).toBe("2026-10-21");
    const fitted = fitText("2026年10月21日(水曜日)", 16, 120);
    expect(fitted.endsWith("…")).toBe(true);
    expect(estimateTextWidth(fitted, 16)).toBeLessThanOrEqual(120);
  });

  it("counts wide characters as a full em", () => {
    expect(estimateTextWidth("日本", 10)).toBe(20);
    expect(estimateTextWidth("ab", 10)).toBe(12);
  });
});
