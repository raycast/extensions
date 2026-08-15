/**
 * Tests for the FIRE chart builder.
 *
 * Covers:
 * - buildBar: bar construction with filled/empty/target marker
 * - formatCompactValue: K/M/B suffix formatting for chart labels
 * - buildProjectionChart: full chart output with target line and FIRE marker
 * - buildDashboardMarkdown: complete dashboard markdown assembly
 *
 * All functions under test are pure (no Raycast imports, no side effects),
 * so no mocks are needed.
 */

import {
  buildBar,
  formatCompactValue,
  buildProjectionChart,
  buildProgressBar,
  buildContributionsSummary,
  buildDashboardMarkdown,
  buildGrowthChartSummary,
  buildSplitChartSummary,
  computeChartBars,
  SplitPortfolioData,
} from "../utils/fire-charts";
import { buildProjectionSVG, ChartBar, ChartConfig } from "../utils/fire-svg";
import { FireContribution, FireProjection, FireProjectionYear, FireSettings } from "../utils/fire-types";

// ──────────────────────────────────────────
// buildBar
// ──────────────────────────────────────────

describe("buildBar", () => {
  it("renders a fully filled bar when filledWidth equals totalWidth", () => {
    const bar = buildBar(10, 10, 5); // totalWidth=10, filledWidth=10, targetPos=5
    expect(bar).toBe("██████████");
    expect(bar.length).toBe(10);
  });

  it("renders a fully empty bar when filledWidth is 0", () => {
    const bar = buildBar(10, 0, 5); // totalWidth=10, filledWidth=0, targetPos=5
    expect(bar).toBe("░░░░░│░░░░");
    expect(bar.length).toBe(10);
  });

  it("shows the target marker at the correct position when not yet filled", () => {
    // 3 filled, 10 total, target at position 7
    const bar = buildBar(10, 3, 7); // totalWidth=10, filledWidth=3, targetPos=7
    expect(bar[7]).toBe("│");
    expect(bar.substring(0, 3)).toBe("███");
    expect(bar.length).toBe(10);
  });

  it("hides the target marker when filled past it", () => {
    // 8 filled, 10 total, target at position 5
    const bar = buildBar(10, 8, 5); // totalWidth=10, filledWidth=8, targetPos=5
    // Target at 5 should be absorbed into the filled portion
    expect(bar[5]).toBe("█");
    expect(bar.substring(0, 8)).toBe("████████");
    expect(bar.substring(8)).toBe("░░");
  });

  it("places target marker at position 0 correctly", () => {
    const bar = buildBar(5, 0, 0); // totalWidth=5, filledWidth=0, targetPos=0
    expect(bar[0]).toBe("│");
    expect(bar).toBe("│░░░░");
  });

  it("handles target at the last position", () => {
    const bar = buildBar(5, 0, 4); // totalWidth=5, filledWidth=0, targetPos=4
    expect(bar[4]).toBe("│");
    expect(bar).toBe("░░░░│");
  });

  it("handles single-character bar", () => {
    const bar = buildBar(1, 0, 0); // totalWidth=1, filledWidth=0, targetPos=0
    expect(bar).toBe("│");
    expect(bar.length).toBe(1);
  });

  it("handles single-character filled bar", () => {
    const bar = buildBar(1, 1, 0); // totalWidth=1, filledWidth=1, targetPos=0
    expect(bar).toBe("█");
    expect(bar.length).toBe(1);
  });

  it("preserves total width regardless of fill", () => {
    for (let fill = 0; fill <= 20; fill++) {
      const bar = buildBar(20, fill, 10); // totalWidth=20, filledWidth=fill, targetPos=10
      expect(bar.length).toBe(20);
    }
  });

  it("target marker at exact boundary of fill (fillWidth == targetPos)", () => {
    // fill 5, target 5 — target not yet filled past, so marker shows
    const bar = buildBar(10, 5, 5); // totalWidth=10, filledWidth=5, targetPos=5
    expect(bar[5]).toBe("│");
    expect(bar.substring(0, 5)).toBe("█████");
  });
});

// ──────────────────────────────────────────
// formatCompactValue
// ──────────────────────────────────────────

describe("formatCompactValue", () => {
  describe("GBP (£)", () => {
    it("formats billions", () => {
      expect(formatCompactValue(1_500_000_000, "GBP")).toBe("£1.5B");
    });

    it("formats millions", () => {
      expect(formatCompactValue(2_300_000, "GBP")).toBe("£2.3M");
    });

    it("formats millions with one decimal", () => {
      expect(formatCompactValue(1_000_000, "GBP")).toBe("£1.0M");
    });

    it("formats thousands", () => {
      expect(formatCompactValue(420_000, "GBP")).toBe("£420K");
    });

    it("formats small thousands", () => {
      expect(formatCompactValue(5_000, "GBP")).toBe("£5K");
    });

    it("formats hundreds", () => {
      expect(formatCompactValue(750, "GBP")).toBe("£750");
    });

    it("formats single digits", () => {
      expect(formatCompactValue(42, "GBP")).toBe("£42");
    });

    it("formats zero", () => {
      expect(formatCompactValue(0, "GBP")).toBe("£0");
    });

    it("formats very small values as zero", () => {
      expect(formatCompactValue(0.5, "GBP")).toBe("£0");
    });
  });

  describe("USD ($)", () => {
    it("formats millions", () => {
      expect(formatCompactValue(1_200_000, "USD")).toBe("$1.2M");
    });

    it("formats thousands", () => {
      expect(formatCompactValue(999_000, "USD")).toBe("$999K");
    });
  });

  describe("unknown currency", () => {
    it("uses currency code as prefix", () => {
      expect(formatCompactValue(500_000, "SEK")).toBe("SEK 500K");
    });
  });

  describe("negative values", () => {
    it("formats negative millions with sign", () => {
      expect(formatCompactValue(-2_500_000, "GBP")).toBe("-£2.5M");
    });

    it("formats negative thousands with sign", () => {
      expect(formatCompactValue(-350_000, "USD")).toBe("-$350K");
    });

    it("formats negative hundreds with sign", () => {
      expect(formatCompactValue(-42, "GBP")).toBe("-£42");
    });
  });

  describe("boundary values", () => {
    it("formats exactly 1 billion", () => {
      expect(formatCompactValue(1_000_000_000, "GBP")).toBe("£1.0B");
    });

    it("formats exactly 1 million", () => {
      expect(formatCompactValue(1_000_000, "GBP")).toBe("£1.0M");
    });

    it("formats exactly 1 thousand", () => {
      expect(formatCompactValue(1_000, "GBP")).toBe("£1K");
    });

    it("formats 999,999 as K (not M)", () => {
      expect(formatCompactValue(999_999, "GBP")).toBe("£1000K");
    });

    it("formats 999,999,999 as M (not B)", () => {
      expect(formatCompactValue(999_999_999, "GBP")).toBe("£1000.0M");
    });
  });
});

// ──────────────────────────────────────────
// buildProjectionChart
// ──────────────────────────────────────────

describe("buildProjectionChart", () => {
  /** Helper to build a simple year array */
  function makeYears(count: number, startValue: number, increment: number, targetValue: number): FireProjectionYear[] {
    const years: FireProjectionYear[] = [];
    for (let i = 0; i < count; i++) {
      const value = startValue + increment * i;
      years.push({
        year: 2025 + i,
        age: 35 + i,
        portfolioValue: value,
        isTargetHit: value >= targetValue,
        isSippAccessible: 35 + i >= 57,
      });
    }
    return years;
  }

  it("returns a message for empty years", () => {
    const chart = buildProjectionChart([], 1_000_000, "GBP", null);
    expect(chart).toBe("*No projection data available.*");
  });

  it("wraps the chart in a code block", () => {
    const years = makeYears(3, 200_000, 100_000, 1_000_000);
    const chart = buildProjectionChart(years, 1_000_000, "GBP", null);
    expect(chart).toContain("```");
    const lines = chart.split("\n");
    expect(lines[0]).toBe("```");
    // Find closing backticks
    const closingIdx = lines.findIndex((l, i) => i > 0 && l === "```");
    expect(closingIdx).toBeGreaterThan(0);
  });

  it("includes a line for each year", () => {
    const years = makeYears(5, 200_000, 50_000, 1_000_000);
    const chart = buildProjectionChart(years, 1_000_000, "GBP", null);
    expect(chart).toContain("2025");
    expect(chart).toContain("2026");
    expect(chart).toContain("2027");
    expect(chart).toContain("2028");
    expect(chart).toContain("2029");
  });

  it("includes value labels", () => {
    const years = makeYears(3, 200_000, 100_000, 1_000_000);
    const chart = buildProjectionChart(years, 1_000_000, "GBP", null);
    expect(chart).toContain("£200K");
    expect(chart).toContain("£300K");
    expect(chart).toContain("£400K");
  });

  it("includes the FIRE marker on the first year that hits the target", () => {
    const years = makeYears(10, 200_000, 100_000, 800_000);
    // Year 2031 (index 6): 200K + 600K = 800K → hits target
    const fireYear = 2031;
    const chart = buildProjectionChart(years, 800_000, "GBP", fireYear);
    expect(chart).toContain(" 🎯");
  });

  it("does not show FIRE marker when target is not hit", () => {
    const years = makeYears(5, 200_000, 50_000, 10_000_000);
    const chart = buildProjectionChart(years, 10_000_000, "GBP", null);
    expect(chart).not.toContain(" 🎯");
  });

  it("shows only one FIRE marker even when multiple years hit target", () => {
    const years = makeYears(10, 200_000, 100_000, 500_000);
    // Years from index 3 onward hit the target
    const fireYear = 2028;
    const chart = buildProjectionChart(years, 500_000, "GBP", fireYear);
    const markerCount = (chart.match(/ 🎯/g) || []).length;
    expect(markerCount).toBe(1);
  });

  it("includes a legend line with target value", () => {
    const years = makeYears(5, 200_000, 100_000, 500_000);
    const chart = buildProjectionChart(years, 500_000, "GBP", 2028);
    expect(chart).toContain("£500K target");
  });

  it("shows 'not yet reached' in legend when target is not hit", () => {
    const years = makeYears(3, 200_000, 50_000, 10_000_000);
    const chart = buildProjectionChart(years, 10_000_000, "GBP", null);
    expect(chart).toContain("not yet reached");
  });

  it("contains bar characters", () => {
    const years = makeYears(3, 200_000, 100_000, 1_000_000);
    const chart = buildProjectionChart(years, 1_000_000, "GBP", null);
    expect(chart).toContain("█");
    expect(chart).toContain("░");
  });

  it("handles all zero values gracefully", () => {
    const years: FireProjectionYear[] = [
      { year: 2025, age: 35, portfolioValue: 0, isTargetHit: false, isSippAccessible: false },
    ];
    const chart = buildProjectionChart(years, 0, "GBP", null);
    // maxValue is 0, should handle gracefully
    expect(chart).toBe("*No projection data available.*");
  });
});

// ──────────────────────────────────────────
// computeChartBars
// ──────────────────────────────────────────

describe("computeChartBars", () => {
  function makeProjection(opts: {
    numYears?: number;
    currentValue?: number;
    annualContribution?: number;
    realGrowthRate?: number;
    targetValue?: number;
  }): FireProjection {
    const {
      numYears = 5,
      currentValue = 200_000,
      annualContribution = 24_000,
      realGrowthRate = 0.045,
      targetValue = 1_000_000,
    } = opts;

    const years: FireProjectionYear[] = [];
    let value = currentValue;
    for (let i = 0; i < numYears; i++) {
      if (i > 0) {
        value = value * (1 + realGrowthRate) + annualContribution * (1 + realGrowthRate / 2);
      }
      years.push({
        year: 2025 + i,
        age: 35 + i,
        portfolioValue: value,
        isTargetHit: value >= targetValue,
        isSippAccessible: false,
      });
    }

    return {
      years,
      fireYear: null,
      fireAge: null,
      daysToFire: null,
      workingDaysToFire: null,
      currentPortfolioValue: currentValue,
      annualContribution,
      realGrowthRate,
      targetValue,
      targetHitInWindow: false,
    };
  }

  it("returns empty array for empty projection", () => {
    const projection: FireProjection = {
      years: [],
      fireYear: null,
      fireAge: null,
      daysToFire: null,
      workingDaysToFire: null,
      currentPortfolioValue: 0,
      annualContribution: 0,
      realGrowthRate: 0,
      targetValue: 1_000_000,
      targetHitInWindow: false,
    };
    expect(computeChartBars(projection, "GBP")).toEqual([]);
  });

  it("returns one bar per projection year", () => {
    const projection = makeProjection({ numYears: 8 });
    const bars = computeChartBars(projection, "GBP");
    expect(bars).toHaveLength(8);
  });

  it("first year base growth equals current portfolio value", () => {
    const projection = makeProjection({ currentValue: 300_000 });
    const bars = computeChartBars(projection, "GBP");
    expect(bars[0].baseGrowthValue).toBe(300_000);
  });

  it("first year contribution value is zero", () => {
    const projection = makeProjection({ currentValue: 300_000 });
    const bars = computeChartBars(projection, "GBP");
    expect(bars[0].contributionValue).toBe(0);
  });

  it("base growth + contribution equals total value for each year", () => {
    const projection = makeProjection({ numYears: 10 });
    const bars = computeChartBars(projection, "GBP");
    for (const bar of bars) {
      expect(bar.baseGrowthValue + bar.contributionValue).toBeCloseTo(bar.totalValue, 2);
    }
  });

  it("contribution value grows over time when contributions exist", () => {
    const projection = makeProjection({ annualContribution: 24_000, numYears: 5 });
    const bars = computeChartBars(projection, "GBP");
    // Year 0 has no contributions, years 1+ should have increasing contribution value
    expect(bars[0].contributionValue).toBe(0);
    for (let i = 2; i < bars.length; i++) {
      expect(bars[i].contributionValue).toBeGreaterThan(bars[i - 1].contributionValue);
    }
  });

  it("contribution value is zero when there are no contributions", () => {
    const projection = makeProjection({ annualContribution: 0, numYears: 5 });
    const bars = computeChartBars(projection, "GBP");
    for (const bar of bars) {
      expect(bar.contributionValue).toBe(0);
    }
  });

  it("base growth compounds correctly without contributions", () => {
    const rate = 0.05;
    const initial = 100_000;
    const projection = makeProjection({
      currentValue: initial,
      annualContribution: 12_000,
      realGrowthRate: rate,
      numYears: 3,
    });
    const bars = computeChartBars(projection, "GBP");
    expect(bars[0].baseGrowthValue).toBeCloseTo(initial, 2);
    expect(bars[1].baseGrowthValue).toBeCloseTo(initial * (1 + rate), 2);
    expect(bars[2].baseGrowthValue).toBeCloseTo(initial * (1 + rate) ** 2, 2);
  });

  it("includes pre-formatted labels", () => {
    const projection = makeProjection({ currentValue: 500_000 });
    const bars = computeChartBars(projection, "GBP");
    expect(bars[0].label).toBe("£500K");
  });

  it("marks only the first target-hit year as isFireYear", () => {
    const projection = makeProjection({
      currentValue: 900_000,
      annualContribution: 200_000,
      targetValue: 1_000_000,
      numYears: 5,
    });
    const bars = computeChartBars(projection, "GBP");
    const fireYears = bars.filter((b) => b.isFireYear);
    expect(fireYears).toHaveLength(1);
  });
});

// ──────────────────────────────────────────
// buildProjectionSVG
// ──────────────────────────────────────────

describe("buildProjectionSVG", () => {
  const sampleBars: ChartBar[] = [
    {
      year: 2025,
      label: "£200K",
      totalValue: 200_000,
      baseGrowthValue: 200_000,
      contributionValue: 0,
      isFireYear: false,
    },
    {
      year: 2026,
      label: "£250K",
      totalValue: 250_000,
      baseGrowthValue: 210_000,
      contributionValue: 40_000,
      isFireYear: false,
    },
    {
      year: 2027,
      label: "£310K",
      totalValue: 310_000,
      baseGrowthValue: 220_000,
      contributionValue: 90_000,
      isFireYear: false,
    },
    {
      year: 2028,
      label: "£400K",
      totalValue: 400_000,
      baseGrowthValue: 230_000,
      contributionValue: 170_000,
      isFireYear: true,
    },
  ];

  const defaultConfig: ChartConfig = {
    targetValue: 400_000,
    targetLabel: "£400K",
    theme: "dark",
  };

  it("returns empty string for empty bars", () => {
    expect(buildProjectionSVG([], defaultConfig)).toBe("");
  });

  it("returns a valid SVG document", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toMatch(/^<svg\s/);
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  // ── CSS media-query theming ──

  it("embeds a <defs><style> block with prefers-color-scheme media queries", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain("<defs>");
    expect(svg).toContain("<style>");
    expect(svg).toContain("@media (prefers-color-scheme: light)");
    expect(svg).toContain("@media (prefers-color-scheme: dark)");
    expect(svg).toContain("</style>");
    expect(svg).toContain("</defs>");
  });

  it("includes both dark AND light palette colours in CSS regardless of theme param", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig); // theme: "dark"
    // Dark palette colours in CSS (hex + fill-opacity, no rgba)
    expect(svg).toContain(".c-bg { fill: #23395B; }");
    expect(svg).toContain(".c-base { fill: #FFFD98; fill-opacity: 0.75; }");
    expect(svg).toContain(".c-contrib { fill: #59C9A5; }");
    expect(svg).toContain(".c-target { stroke: #D81E5B; }");
    // Light palette colours also in CSS
    expect(svg).toContain(".c-bg { fill: #FFFD98; }");
    expect(svg).toContain(".c-base { fill: #23395B; fill-opacity: 0.55; }");
    expect(svg).toContain(".c-contrib { fill: #59C9A5; }");
    expect(svg).toContain(".c-target { stroke: #D81E5B; }");
  });

  it("applies CSS class attributes to themed elements", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain('class="c-bg"');
    expect(svg).toContain('class="c-track"');
    expect(svg).toContain('class="c-base"');
    expect(svg).toContain('class="c-contrib"');
    expect(svg).toContain('class="c-target"');
    expect(svg).toContain('class="c-text"');
    expect(svg).toContain('class="c-muted"');
    expect(svg).toContain('class="c-legend"');
  });

  // ── Inline fallback attributes ──

  it("includes inline fill fallback on background rect for dark theme", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // Inline presentation attribute as fallback when CSS media queries unsupported
    expect(svg).toContain('class="c-bg"');
    expect(svg).toContain('fill="#23395B"');
  });

  it("includes inline fill fallback on background rect for light theme", () => {
    const lightConfig: ChartConfig = { ...defaultConfig, theme: "light" };
    const svg = buildProjectionSVG(sampleBars, lightConfig);
    // Inline presentation attribute uses the theme param for fallback
    expect(svg).toMatch(/class="c-bg"[^>]*fill="#FFFD98"/);
  });

  it("contains a rect for each bar track with class and inline fallback", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // Each bar has a track rect with class, hex fill, and fill-opacity (no rgba)
    const trackMatches = svg.match(/class="c-track"[^>]*fill="#B9E3C6"[^>]*fill-opacity="0\.08"/g);
    expect(trackMatches).not.toBeNull();
    expect(trackMatches!.length).toBe(sampleBars.length);
  });

  it("contains base growth rect elements with class and inline fallback", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // Base growth rects have class for CSS override and hex fill + fill-opacity as fallback
    expect(svg).toMatch(/class="c-base"[^>]*fill="#FFFD98"[^>]*fill-opacity="0\.75"/);
  });

  it("contains contribution rect elements with class and inline fallback", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // Contribution rects have class for CSS override and inline fill as fallback
    expect(svg).toMatch(/class="c-contrib"[^>]*fill="#59C9A5"/);
  });

  it("contains year labels", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain(">2025</text>");
    expect(svg).toContain(">2026</text>");
    expect(svg).toContain(">2027</text>");
    expect(svg).toContain(">2028</text>");
  });

  it("contains value labels", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain("£200K");
    expect(svg).toContain("£310K");
  });

  it("contains the target dashed line with class and inline fallback", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toMatch(/class="c-target"[^>]*stroke="#D81E5B"/);
    expect(svg).toContain("stroke-dasharray");
  });

  it("highlights the FIRE year row with class and inline fallback", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // FIRE highlight rect has class for CSS and hex fill + fill-opacity as fallback
    expect(svg).toMatch(/class="c-fire-hl"[^>]*fill="#59C9A5"[^>]*fill-opacity="0\.18"/);
  });

  it("applies fire accent class to FIRE year labels", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // The FIRE year (2028) label should have the fire accent class
    expect(svg).toMatch(/class="c-fire"[^>]*>2028<\/text>/);
  });

  it("adds FIRE marker emoji on the FIRE year value label", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain("🔥");
  });

  it("contains a legend with Base and Contributions labels", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain("Base");
    expect(svg).toContain("Contributions");
    expect(svg).toContain("Target");
  });

  it("includes the target label in the legend", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).toContain("£400K Target");
  });

  it("uses light theme palette for inline fallback attributes when theme is light", () => {
    const lightConfig: ChartConfig = { ...defaultConfig, theme: "light" };
    const svg = buildProjectionSVG(sampleBars, lightConfig);
    // Inline fallback attributes use light palette colours (hex + fill-opacity, no rgba)
    expect(svg).toMatch(/class="c-contrib"[^>]*fill="#59C9A5"/);
    expect(svg).toMatch(/class="c-base"[^>]*fill="#23395B"[^>]*fill-opacity="0\.55"/);
    expect(svg).toMatch(/class="c-target"[^>]*stroke="#D81E5B"/);
  });

  it("still contains both CSS palettes even when theme is light", () => {
    const lightConfig: ChartConfig = { ...defaultConfig, theme: "light" };
    const svg = buildProjectionSVG(sampleBars, lightConfig);
    // CSS block always contains both palettes for auto-detection
    expect(svg).toContain("@media (prefers-color-scheme: dark)");
    expect(svg).toContain(".c-bg { fill: #23395B; }");
    expect(svg).toContain(".c-text { fill: #FFFD98; fill-opacity: 0.9; }");
    expect(svg).toContain("@media (prefers-color-scheme: light)");
    expect(svg).toContain(".c-bg { fill: #FFFD98; }");
    expect(svg).toContain(".c-text { fill: #23395B; fill-opacity: 0.82; }");
  });

  it("never emits rgba() in SVG output (SVG 1.1 compat)", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    expect(svg).not.toMatch(/fill="rgba\(/);
    expect(svg).not.toMatch(/stroke="rgba\(/);
  });

  it("returns empty string when maxValue is zero", () => {
    const zeroBars: ChartBar[] = [
      { year: 2025, label: "£0", totalValue: 0, baseGrowthValue: 0, contributionValue: 0, isFireYear: false },
    ];
    const zeroConfig: ChartConfig = { ...defaultConfig, targetValue: 0 };
    expect(buildProjectionSVG(zeroBars, zeroConfig)).toBe("");
  });

  it("height scales with number of bars", () => {
    const shortBars = sampleBars.slice(0, 2);
    const svgShort = buildProjectionSVG(shortBars, defaultConfig);
    const svgFull = buildProjectionSVG(sampleBars, defaultConfig);
    // Extract height from viewBox
    const heightShort = Number(svgShort.match(/viewBox="0 0 \d+ (\d+)"/)?.[1] ?? 0);
    const heightFull = Number(svgFull.match(/viewBox="0 0 \d+ (\d+)"/)?.[1] ?? 0);
    expect(heightFull).toBeGreaterThan(heightShort);
  });

  it("does not render contribution rects when all contribution values are zero", () => {
    const noContribBars: ChartBar[] = [
      {
        year: 2025,
        label: "£200K",
        totalValue: 200_000,
        baseGrowthValue: 200_000,
        contributionValue: 0,
        isFireYear: false,
      },
      {
        year: 2026,
        label: "£210K",
        totalValue: 210_000,
        baseGrowthValue: 210_000,
        contributionValue: 0,
        isFireYear: false,
      },
    ];
    const svg = buildProjectionSVG(noContribBars, defaultConfig);
    // The legend always contains a small swatch with the contribution colour,
    // but no actual bar rects should use it. Legend swatches are 10×10;
    // bar rects use height="18". Count only bar-sized contribution rects.
    const contribBarRects = svg.match(/class="c-contrib"[^>]*height="18"/g);
    expect(contribBarRects).toBeNull();
  });

  it("legend elements carry theme CSS classes", () => {
    const svg = buildProjectionSVG(sampleBars, defaultConfig);
    // Legend swatches and text should have CSS classes for theme adaptation
    // Portfolio Growth swatch uses c-base class
    expect(svg).toMatch(/class="c-base"[^>]*width="10"[^>]*height="10"/);
    // Contributions swatch uses c-contrib class
    expect(svg).toMatch(/class="c-contrib"[^>]*width="10"[^>]*height="10"/);
    // Legend text uses c-legend class
    expect(svg).toMatch(/class="c-legend"[^>]*>Base<\/text>/);
    expect(svg).toMatch(/class="c-legend"[^>]*>Contributions<\/text>/);
    // Target legend line uses c-target class
    expect(svg).toMatch(/class="c-target"[^>]*stroke-dasharray="3,2"/);
  });
});

// ──────────────────────────────────────────
// buildProgressBar
// ──────────────────────────────────────────

describe("buildProgressBar", () => {
  it("returns empty string when target is zero", () => {
    expect(buildProgressBar(100_000, 0, "GBP")).toBe("");
  });

  it("returns empty string when target is negative", () => {
    expect(buildProgressBar(100_000, -500, "GBP")).toBe("");
  });

  it("wraps the bar in a code block", () => {
    const result = buildProgressBar(200_000, 1_000_000, "GBP");
    const lines = result.split("\n");
    expect(lines[0]).toBe("```");
    expect(lines[lines.length - 1]).toBe("```");
  });

  it("shows the correct percentage", () => {
    const result = buildProgressBar(500_000, 1_000_000, "GBP");
    expect(result).toContain("50%");
  });

  it("caps percentage at 100% when current exceeds target", () => {
    const result = buildProgressBar(1_500_000, 1_000_000, "GBP");
    expect(result).toContain("100%");
    expect(result).not.toContain("150%");
  });

  it("shows 0% when current value is zero", () => {
    const result = buildProgressBar(0, 1_000_000, "GBP");
    expect(result).toContain("0%");
  });

  it("includes current and target value labels with arrow", () => {
    const result = buildProgressBar(200_000, 1_000_000, "GBP");
    expect(result).toContain("£200K");
    expect(result).toContain("£1.0M");
    expect(result).toContain("→");
  });

  it("contains filled and empty bar characters", () => {
    const result = buildProgressBar(200_000, 1_000_000, "GBP");
    expect(result).toContain("█");
    expect(result).toContain("░");
  });

  it("shows fully filled bar at 100%", () => {
    const result = buildProgressBar(1_000_000, 1_000_000, "GBP");
    expect(result).not.toContain("░");
    expect(result).toContain("█");
  });

  it("shows fully empty bar at 0%", () => {
    const result = buildProgressBar(0, 1_000_000, "GBP");
    expect(result).not.toContain("█");
    expect(result).toContain("░");
  });

  it("uses the correct currency symbol", () => {
    const resultUSD = buildProgressBar(200_000, 1_000_000, "USD");
    expect(resultUSD).toContain("$200K");
    expect(resultUSD).toContain("$1.0M");
  });

  it("bar has consistent total width of 32 characters", () => {
    const result = buildProgressBar(300_000, 1_000_000, "GBP");
    const barLine = result.split("\n")[1]; // middle line inside code block
    const filledCount = (barLine.match(/█/g) || []).length;
    const emptyCount = (barLine.match(/░/g) || []).length;
    expect(filledCount + emptyCount).toBe(32);
  });

  // ── Debt / negative net-worth regression ──

  it("does not throw when current value is negative (debt > assets)", () => {
    // RangeError: Invalid count value: -1 was thrown before the fix
    expect(() => buildProgressBar(-15_000, 1_000_000, "GBP")).not.toThrow();
  });

  it("shows 0% progress when current value is negative", () => {
    const result = buildProgressBar(-15_000, 1_000_000, "GBP");
    expect(result).toContain("0%");
  });

  it("shows fully empty bar when current value is negative", () => {
    const result = buildProgressBar(-15_000, 1_000_000, "GBP");
    expect(result).not.toContain("█");
    expect(result).toContain("░");
  });

  it("still shows the actual negative current value label when in debt", () => {
    const result = buildProgressBar(-15_000, 1_000_000, "GBP");
    // formatCompactValue handles negatives — display should show -£15K
    expect(result).toContain("-£15K");
    expect(result).toContain("£1.0M");
  });

  it("bar has consistent total width of 32 characters when current value is negative", () => {
    const result = buildProgressBar(-15_000, 1_000_000, "GBP");
    const barLine = result.split("\n")[1];
    const filledCount = (barLine.match(/█/g) || []).length;
    const emptyCount = (barLine.match(/░/g) || []).length;
    expect(filledCount + emptyCount).toBe(32);
  });
});

// ──────────────────────────────────────────
// buildContributionsSummary
// ──────────────────────────────────────────

describe("buildContributionsSummary", () => {
  type ResolvedContribution = FireContribution & { displayName: string; accountName: string };

  it("shows hint message when no contributions exist", () => {
    const result = buildContributionsSummary([], "GBP");
    expect(result).toContain("No monthly contributions configured");
    expect(result).toContain("⌘⇧C");
  });

  it("shows single contribution as a compact one-liner", () => {
    const contributions: ResolvedContribution[] = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 500,
        displayName: "Vanguard S&P 500",
        accountName: "ISA",
      },
    ];
    const result = buildContributionsSummary(contributions, "GBP");
    expect(result).toContain("💰");
    expect(result).toContain("£500/mo");
    expect(result).toContain("Vanguard S&P 500");
    expect(result).toContain("ISA");
    expect(result).toContain("£6K/yr");
    // Single contribution should NOT have bullet points
    expect(result).not.toContain("- £");
  });

  it("shows multiple contributions as header + bullet list", () => {
    const contributions: ResolvedContribution[] = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 500,
        displayName: "Vanguard S&P 500",
        accountName: "Vanguard ISA",
      },
      {
        id: "c2",
        positionId: "p2",
        accountId: "a1",
        monthlyAmount: 300,
        displayName: "Apple Inc.",
        accountName: "Vanguard ISA",
      },
    ];
    const result = buildContributionsSummary(contributions, "GBP");
    // Header line with total
    expect(result).toContain("💰");
    expect(result).toContain("Contributions:");
    expect(result).toContain("£800/mo");
    expect(result).toContain("£10K/yr");
    // Individual items as bullet points
    expect(result).toContain("- £500/mo → Vanguard S&P 500");
    expect(result).toContain("- £300/mo → Apple Inc.");
    expect(result).toContain("Vanguard ISA");
  });

  it("uses the correct currency symbol", () => {
    const contributions: ResolvedContribution[] = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 1000,
        displayName: "VOO",
        accountName: "Brokerage",
      },
    ];
    const resultUSD = buildContributionsSummary(contributions, "USD");
    expect(resultUSD).toContain("$1K/mo");

    const resultGBP = buildContributionsSummary(contributions, "GBP");
    expect(resultGBP).toContain("£1K/mo");
  });

  it("renders account name in italics", () => {
    const contributions: ResolvedContribution[] = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 200,
        displayName: "VWRL",
        accountName: "My ISA",
      },
    ];
    const result = buildContributionsSummary(contributions, "GBP");
    expect(result).toContain("*My ISA*");
  });

  it("does not render a table", () => {
    const contributions: ResolvedContribution[] = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 500,
        displayName: "VWRL",
        accountName: "ISA",
      },
      {
        id: "c2",
        positionId: "p2",
        accountId: "a2",
        monthlyAmount: 300,
        displayName: "VUSA",
        accountName: "SIPP",
      },
    ];
    const result = buildContributionsSummary(contributions, "GBP");
    // No markdown table syntax
    expect(result).not.toContain("| ");
    expect(result).not.toContain("|--");
  });
});

// ──────────────────────────────────────────
// buildDashboardMarkdown
// ──────────────────────────────────────────

describe("buildDashboardMarkdown", () => {
  /** Minimal settings for testing */
  const testSettings: FireSettings = {
    targetValue: 1_000_000,
    withdrawalRate: 4,
    annualInflation: 2.5,
    annualGrowthRate: 7,
    yearOfBirth: 1990,
    holidayEntitlement: 25,
    sippAccessAge: 57,
    excludedAccountIds: [],
    contributions: [],
    updatedAt: "2025-01-15T00:00:00.000Z",
  };

  /** Build a minimal projection result */
  function makeProjection(opts: {
    targetHit: boolean;
    fireYear?: number;
    fireAge?: number;
    /** Override the starting portfolio value (e.g. negative when debt > assets) */
    currentPortfolioValue?: number;
  }): FireProjection {
    const startValue = opts.currentPortfolioValue ?? 200_000;
    const years: FireProjectionYear[] = [];
    for (let i = 0; i < 10; i++) {
      // When starting negative, grow toward the target using a simple linear ramp
      // so the projection is plausible without requiring the full calculator.
      const portfolioValue = i === 0 ? startValue : 200_000 + i * 100_000;
      years.push({
        year: 2025 + i,
        age: 35 + i,
        portfolioValue,
        isTargetHit: opts.targetHit && portfolioValue >= 1_000_000,
        isSippAccessible: false,
      });
    }

    return {
      years,
      fireYear: opts.fireYear ?? null,
      fireAge: opts.fireAge ?? null,
      daysToFire: opts.targetHit ? 2920 : null,
      workingDaysToFire: opts.targetHit ? 2320 : null,
      currentPortfolioValue: startValue,
      annualContribution: 24_000,
      realGrowthRate: 0.045,
      targetValue: 1_000_000,
      targetHitInWindow: opts.targetHit,
    };
  }

  it("includes the FIRE Dashboard header", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", []);
    expect(md).toContain("# 🔥 FIRE Dashboard");
  });

  it("shows 'On track' message when target is hit", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", []);
    expect(md).toContain("On track!");
    expect(md).toContain("2033");
    expect(md).toContain("age 43");
  });

  it("uses target FIRE age messaging when set and on track", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const settings = { ...testSettings, targetFireAge: 50 };
    const { markdown: md } = buildDashboardMarkdown(projection, settings, "GBP", []);
    expect(md).toContain("On track!");
    expect(md).toContain("meeting your target age **50**");
  });

  it("uses target FIRE year messaging when set and not on track", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const settings = { ...testSettings, targetFireYear: 2028 };
    const { markdown: md } = buildDashboardMarkdown(projection, settings, "GBP", []);
    expect(md).toContain("Not on track for your target year **2028**");
    expect(md).toContain("2033");
    expect(md).toContain("age 43");
  });

  it("shows warning message when target is not hit", () => {
    const projection = makeProjection({ targetHit: false });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", []);
    expect(md).toContain("⚠️");
    expect(md).toContain("Target not reached");
  });

  it("includes the progress bar", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    // Progress bar shows current → target with percentage
    expect(md).toContain("£200K");
    expect(md).toContain("→");
    expect(md).toContain("£1.0M");
    expect(md).toContain("20%");
  });

  it("includes the Portfolio Projection section", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(md).toContain("## Portfolio Projection");
  });

  it("embeds the SVG chart as a base64 data URI image", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(md).toContain("![FIRE Projection](data:image/svg+xml;base64,");
  });

  it("SVG contains stacked bar data (base growth + contributions)", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    // Decode the base64 SVG and check it contains expected elements
    const b64Match = md.match(/base64,([A-Za-z0-9+/=]+)\)/);
    expect(b64Match).not.toBeNull();
    const svg = Buffer.from(b64Match![1], "base64").toString("utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Base");
    expect(svg).toContain("Contributions");
  });

  it("includes assumptions line with emoji, growth, inflation, and withdrawal rate", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(md).toContain("📈");
    expect(md).toContain("Growth 7%");
    expect(md).toContain("Inflation 2.5%");
    expect(md).toContain("4.5% real return");
    expect(md).toContain("Withdrawal rate 4%");
  });

  it("shows contributions summary when contributions exist", () => {
    const contributions = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 500,
        displayName: "Vanguard S&P 500",
        accountName: "Vanguard ISA",
      },
      {
        id: "c2",
        positionId: "p2",
        accountId: "a1",
        monthlyAmount: 300,
        displayName: "Apple Inc.",
        accountName: "Vanguard ISA",
      },
    ];

    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", contributions, "dark");
    // Compact emoji list, not a table
    expect(md).toContain("💰");
    expect(md).toContain("Vanguard S&P 500");
    expect(md).toContain("Apple Inc.");
    expect(md).toContain("Vanguard ISA");
    // No table syntax
    expect(md).not.toContain("| Position |");
    expect(md).not.toContain("| Account |");
  });

  it("shows hint when no contributions exist", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(md).toContain("No monthly contributions configured");
    expect(md).toContain("⌘⇧C");
  });

  it("shows single contribution as one-liner without bullet list", () => {
    const contributions = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 500,
        displayName: "VUSA.L",
        accountName: "ISA",
      },
    ];

    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", contributions, "dark");
    expect(md).toContain("💰");
    expect(md).toContain("VUSA.L");
    expect(md).toContain("ISA");
    // Single item — no bullet points, no "Contributions:" header
    expect(md).not.toContain("- £");
    expect(md).not.toContain("Contributions:");
  });

  it("uses the correct currency symbol", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: mdGBP } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(mdGBP).toContain("£");

    const { markdown: mdUSD } = buildDashboardMarkdown(projection, testSettings, "USD", [], "dark");
    expect(mdUSD).toContain("$");
  });

  it("contains the projection chart as an SVG image", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    // Chart is rendered as a base64-encoded SVG image, not an ASCII code block
    expect(md).toContain("data:image/svg+xml;base64,");
    expect(md).toContain("![FIRE Projection]");
  });

  it("handles different growth/inflation combinations in assumptions", () => {
    const customSettings: FireSettings = {
      ...testSettings,
      annualGrowthRate: 10,
      annualInflation: 3,
      withdrawalRate: 3.5,
    };
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, customSettings, "GBP", [], "dark");
    expect(md).toContain("Growth 10%");
    expect(md).toContain("Inflation 3%");
    expect(md).toContain("7.0% real return");
    expect(md).toContain("Withdrawal rate 3.5%");
  });

  it("does not contain any markdown table syntax", () => {
    const contributions = [
      {
        id: "c1",
        positionId: "p1",
        accountId: "a1",
        monthlyAmount: 500,
        displayName: "VWRL",
        accountName: "ISA",
      },
      {
        id: "c2",
        positionId: "p2",
        accountId: "a2",
        monthlyAmount: 300,
        displayName: "VUSA",
        accountName: "SIPP",
      },
    ];
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", contributions, "dark");
    // Ensure no table pipes outside of code blocks
    const outsideCodeBlocks = md.replace(/```[\s\S]*?```/g, "");
    expect(outsideCodeBlocks).not.toContain("|--");
  });

  it("respects light theme for the embedded SVG", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const { markdown: md } = buildDashboardMarkdown(projection, testSettings, "GBP", [], "light");
    const b64Match = md.match(/base64,([A-Za-z0-9+/=]+)\)/);
    expect(b64Match).not.toBeNull();
    const svg = Buffer.from(b64Match![1], "base64").toString("utf-8");
    // Light theme uses custom palette colours (hex + fill-opacity, no rgba)
    expect(svg).toContain("#59C9A5"); // contributions (teal)
    expect(svg).toContain('fill="#23395B" fill-opacity="0.55"'); // base growth (navy)
  });

  // ── Result shape tests ──

  it("returns growthSvg as a raw SVG string", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const result = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(result.growthSvg).not.toBeNull();
    expect(result.growthSvg).toContain("<svg");
    expect(result.growthSvg).toContain("</svg>");
  });

  it("returns null splitSvg when no split data is provided", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const result = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(result.splitSvg).toBeNull();
  });

  it("returns growthSummary as a non-empty string", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const result = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(result.growthSummary).not.toBeNull();
    expect(result.growthSummary!.length).toBeGreaterThan(0);
  });

  it("embeds the growth summary as an SVG <title> tooltip", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const result = buildDashboardMarkdown(projection, testSettings, "GBP", [], "dark");
    expect(result.growthSvg).toContain("<title>");
    expect(result.growthSvg).toContain("FIRE Growth Projection");
  });

  // ── Debt / negative net-worth regression ──
  // When debt exceeds other assets, currentPortfolioValue is negative.
  // buildProgressBar used to throw RangeError: Invalid count value: -1
  // because percent went negative and was passed to String.repeat().

  it("does not throw when current portfolio value is negative (debt > assets)", () => {
    // Simulate a portfolio where outstanding debt exceeds invested assets.
    // currentPortfolioValue of -15_000 is passed into the projection.
    const negativeProjection = makeProjection({
      targetHit: true,
      fireYear: 2038,
      fireAge: 48,
      currentPortfolioValue: -15_000,
    });
    expect(() => buildDashboardMarkdown(negativeProjection, testSettings, "GBP", [], "dark")).not.toThrow();
  });

  it("renders 0% progress bar (not a negative bar) when portfolio is in net debt", () => {
    const negativeProjection = makeProjection({
      targetHit: true,
      fireYear: 2038,
      fireAge: 48,
      currentPortfolioValue: -15_000,
    });
    const { markdown: md } = buildDashboardMarkdown(negativeProjection, testSettings, "GBP", [], "dark");
    expect(md).toContain("0%");
    expect(md).not.toContain("█"); // no filled bar characters
  });

  it("shows the actual negative current value label in the progress bar when in debt", () => {
    const negativeProjection = makeProjection({
      targetHit: true,
      fireYear: 2038,
      fireAge: 48,
      currentPortfolioValue: -15_000,
    });
    const { markdown: md } = buildDashboardMarkdown(negativeProjection, testSettings, "GBP", [], "dark");
    expect(md).toContain("-£15K");
    expect(md).toContain("£1.0M");
  });
});

// ──────────────────────────────────────────
// buildGrowthChartSummary
// ──────────────────────────────────────────

describe("buildGrowthChartSummary", () => {
  const testSettings: FireSettings = {
    targetValue: 1_000_000,
    withdrawalRate: 4,
    annualInflation: 2.5,
    annualGrowthRate: 7,
    yearOfBirth: 1990,
    holidayEntitlement: 25,
    sippAccessAge: 57,
    excludedAccountIds: [],
    contributions: [],
    updatedAt: "2025-01-15T00:00:00.000Z",
  };

  function makeProjection(opts: { targetHit: boolean; fireYear?: number; fireAge?: number }): FireProjection {
    const years: FireProjectionYear[] = [];
    for (let i = 0; i < 10; i++) {
      years.push({
        year: 2025 + i,
        age: 35 + i,
        portfolioValue: 200_000 + i * 100_000,
        isTargetHit: opts.targetHit && 200_000 + i * 100_000 >= 1_000_000,
        isSippAccessible: false,
      });
    }

    return {
      years,
      fireYear: opts.fireYear ?? null,
      fireAge: opts.fireAge ?? null,
      daysToFire: opts.targetHit ? 2920 : null,
      workingDaysToFire: opts.targetHit ? 2320 : null,
      currentPortfolioValue: 200_000,
      annualContribution: 24_000,
      realGrowthRate: 0.045,
      targetValue: 1_000_000,
      targetHitInWindow: opts.targetHit,
    };
  }

  it("includes the header and key metrics", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summary).toContain("FIRE Growth Projection");
    expect(summary).toContain("Starting Portfolio: £200K");
    expect(summary).toContain("FIRE Target: £1.0M");
    expect(summary).toContain("4.5%");
    expect(summary).toContain("7% growth");
    expect(summary).toContain("2.5% inflation");
  });

  it("includes annual contributions", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summary).toContain("Annual Contributions: £24K/yr");
  });

  it("includes sample year calculation illustration", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summary).toContain("How it works:");
    expect(summary).toContain("2025");
    expect(summary).toContain("growth");
  });

  it("includes projected FIRE year when target is hit", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summary).toContain("Projected FIRE: 2033");
    expect(summary).toContain("age 43");
  });

  it("shows warning when target is not hit", () => {
    const projection = makeProjection({ targetHit: false });
    const summary = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summary).toContain("Target not reached");
  });

  it("shows 'none' for contributions when annual contribution is zero", () => {
    const projection = makeProjection({ targetHit: false });
    projection.annualContribution = 0;
    const summary = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summary).toContain("Annual Contributions: none");
  });

  it("uses the correct currency symbol", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summaryGBP = buildGrowthChartSummary(projection, testSettings, "GBP");
    expect(summaryGBP).toContain("£");

    const summaryUSD = buildGrowthChartSummary(projection, testSettings, "USD");
    expect(summaryUSD).toContain("$");
  });
});

// ──────────────────────────────────────────
// buildSplitChartSummary
// ──────────────────────────────────────────

describe("buildSplitChartSummary", () => {
  const testSettings: FireSettings = {
    targetValue: 1_000_000,
    withdrawalRate: 4,
    annualInflation: 2.5,
    annualGrowthRate: 7,
    yearOfBirth: 1990,
    holidayEntitlement: 25,
    sippAccessAge: 57,
    excludedAccountIds: [],
    contributions: [],
    updatedAt: "2025-01-15T00:00:00.000Z",
  };

  const testSplitData: SplitPortfolioData = {
    accessibleValue: 150_000,
    lockedValue: 50_000,
    accessibleAnnualContribution: 18_000,
    lockedAnnualContribution: 6_000,
  };

  function makeProjection(opts: { targetHit: boolean; fireYear?: number; fireAge?: number }): FireProjection {
    const years: FireProjectionYear[] = [];
    for (let i = 0; i < 10; i++) {
      years.push({
        year: 2025 + i,
        age: 35 + i,
        portfolioValue: 200_000 + i * 100_000,
        isTargetHit: opts.targetHit && 200_000 + i * 100_000 >= 1_000_000,
        isSippAccessible: false,
      });
    }

    return {
      years,
      fireYear: opts.fireYear ?? null,
      fireAge: opts.fireAge ?? null,
      daysToFire: opts.targetHit ? 2920 : null,
      workingDaysToFire: opts.targetHit ? 2320 : null,
      currentPortfolioValue: 200_000,
      annualContribution: 24_000,
      realGrowthRate: 0.045,
      targetValue: 1_000_000,
      targetHitInWindow: opts.targetHit,
    };
  }

  it("includes the header", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).toContain("Accessible vs Locked Split");
  });

  it("shows accessible and locked starting values", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).toContain("Accessible (ISA/GIA): £150K");
    expect(summary).toContain("Locked (SIPP/401K): £50K");
  });

  it("shows contribution split", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).toContain("£18K/yr accessible");
    expect(summary).toContain("£6K/yr locked");
  });

  it("includes pension access age and year", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).toContain("Pension Access: age 57 (2047)");
  });

  it("includes a sample midpoint year", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).toContain("Example (");
    expect(summary).toContain("accessible");
    expect(summary).toContain("locked");
  });

  it("shows FIRE year when target is hit", () => {
    const projection = makeProjection({ targetHit: true, fireYear: 2033, fireAge: 43 });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).toContain("FIRE target reached: 2033");
    expect(summary).toContain("age 43");
  });

  it("does not show FIRE year when target is not hit", () => {
    const projection = makeProjection({ targetHit: false });
    const summary = buildSplitChartSummary(projection, testSettings, testSplitData, "GBP");
    expect(summary).not.toContain("FIRE target reached");
  });
});
