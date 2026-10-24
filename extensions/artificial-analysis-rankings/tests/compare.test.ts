import { describe, expect, it } from "vitest";
import { comparisonCardSvg, modelTileSvg } from "../src/lib/cards";
import { compareMetric } from "../src/lib/compare";
import { model } from "./fixtures";

const verdicts = (...args: Parameters<typeof compareMetric>) => compareMetric(...args).map(({ verdict }) => verdict);

describe("model comparison", () => {
  it("marks higher scores and speeds as better", () => {
    const models = [model({ id: "a", intelligence: 60, speed: 50 }), model({ id: "b", intelligence: 70, speed: 90 })];
    expect(verdicts(models, "intelligence")).toEqual(["worst", "best"]);
    expect(verdicts(models, "speed")).toEqual(["worst", "best"]);
  });

  it("marks lower prices and latency as better", () => {
    const models = [model({ id: "a", inputPrice: 0.5, latency: 2 }), model({ id: "b", inputPrice: 3, latency: 0.4 })];
    expect(verdicts(models, "inputPrice")).toEqual(["best", "worst"]);
    expect(verdicts(models, "latency")).toEqual(["worst", "best"]);
  });

  it("keeps middle models neutral and colors ties alike", () => {
    const models = [
      model({ id: "a", coding: 80 }),
      model({ id: "b", coding: 50 }),
      model({ id: "c", coding: 65 }),
      model({ id: "d", coding: 80 }),
    ];
    expect(verdicts(models, "coding")).toEqual(["best", "worst", "neutral", "best"]);
  });

  it("does not color missing, single, or equal measurements", () => {
    expect(verdicts([model({ speed: null }), model({ speed: 100 })], "speed")).toEqual(["missing", "neutral"]);
    expect(verdicts([model({ outputPrice: 2 }), model({ outputPrice: 2 })], "outputPrice")).toEqual([
      "neutral",
      "neutral",
    ]);
    expect(verdicts([model({ latency: -1 }), model({ latency: 1 })], "latency")).toEqual(["missing", "neutral"]);
    expect(compareMetric([model({ latency: 1 })], "latency")[0]).toMatchObject({ value: 1, verdict: "neutral" });
  });
});

describe("comparison cards", () => {
  const logo = '<svg width="1em" height="1em" viewBox="0 0 24 24"><path d="M1 1h20v20H1z"/></svg>';
  const card = (name: string) => ({
    name,
    configuration: "Example Lab · High",
    logo,
    values: [
      { label: "Intelligence", value: "74.6", verdict: "best" as const },
      { label: "Coding", value: "60.0", verdict: "worst" as const },
      { label: "Speed (tok/s)", value: "—", verdict: "missing" as const },
      { label: "Latency (s)", value: "2.1", verdict: "neutral" as const },
    ],
  });

  it("draws portrait cards with stacked tiles colored by verdict", () => {
    const svg = comparisonCardSvg(card("Alpha"), "light", "portrait");
    expect(svg).toContain('viewBox="0 0 360 480"');
    expect(svg).toContain('fill="#dcfce7"');
    expect(svg).toContain('fill="#fee2e2"');
    expect(svg).toContain(">74.6</text>");
    expect(svg).not.toContain('text-anchor="end"');
    expect(svg).not.toContain('width="1em"');
  });

  it("draws tall cards with inline, right-aligned values", () => {
    const svg = comparisonCardSvg(card("Alpha"), "dark", "tall");
    expect(svg).toContain('viewBox="0 0 360 640"');
    expect(svg).toContain('text-anchor="end"');
    expect(svg).toContain('fill="#4ade80">74.6</text>');
  });

  it("anchors names to the bottom of the header and escapes API text", () => {
    const short = comparisonCardSvg(card("Alpha"), "dark", "portrait");
    const long = comparisonCardSvg(card("Gemini 3.5 Flash-Lite"), "dark", "portrait");
    const unsafe = comparisonCardSvg(card("A <b> & Co"), "dark", "portrait");
    expect(short).toContain('y="132" font-family');
    expect(long).toContain('y="100" font-family');
    expect(unsafe).toContain("A &lt;b&gt; &amp; Co");
    expect(unsafe).not.toContain("<b>");
  });

  it("draws wide cards with the name beside the logo for two-model comparisons", () => {
    const svg = comparisonCardSvg(card("Alpha"), "dark", "wide");
    expect(svg).toContain('viewBox="0 0 360 270"');
    expect(svg).toContain('x="72" y="46" font-family');
    expect(svg).toContain('fill="#f87171">60.0</text>');
  });

  it("marks search results already in the comparison", () => {
    const added = modelTileSvg({ name: "Alpha", detail: "Added", logo, added: true }, "dark");
    const open = modelTileSvg({ name: "Beta <X>", detail: "High", logo, added: false }, "dark");
    expect(added).toContain("<circle");
    expect(open).not.toContain("<circle");
    expect(open).toContain("Beta &lt;X&gt;");
  });
});
