import { expect, it } from "vitest";
import {
  codePreview,
  durationLabel,
  previewMarkdown,
} from "./detail-layout.ts";
import { existsSync, readFileSync } from "node:fs";
import { COMPONENTS } from "./preview.ts";
import { formatIcon } from "./format-icons.ts";

it("keeps the curve on initial selection and after the component GIF is ready", () => {
  const curve = "![Curve](data:image/svg+xml;base64,example)";
  for (const theme of ["dark", "light"] as const)
    for (const component of COMPONENTS) {
      const initial = previewMarkdown(curve, component, theme, "assets");
      const ready = previewMarkdown(
        curve,
        component,
        theme,
        "assets",
        "/cache/complete.gif",
      );
      expect(initial.split("\n\n")[1]).toBe(curve);
      expect(ready.split("\n\n")[1]).toBe(curve);
      for (const md of [initial, ready]) {
        expect(md.match(/!\[/g)).toHaveLength(2);
        expect(md).toContain("raycast-width=340&raycast-height=176");
      }
      const poster = `assets/preview-${component.toLowerCase().replaceAll(" ", "-")}-${theme}.png`;
      expect(existsSync(poster)).toBe(true);
      const png = readFileSync(poster);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([680, 352]);
      expect(initial).toContain(poster);
      expect(ready).toContain("/cache/complete.gif");
    }
});
it("provides a bundled identity icon for every output, including unavailable outputs", () => {
  for (const input of [
    "ease-out",
    ".spring(duration: 0.5, bounce: 0.6)",
    "linear(0, 1)",
  ])
    for (const output of convert(input).outputs)
      for (const theme of ["dark", "light"] as const)
        expect(
          existsSync(`assets/${formatIcon(output.id, theme).source}`),
        ).toBe(true);
});
import { convert } from "./convert.ts";
import { graphSVG } from "./graph.ts";
import { fromDuration } from "./model.ts";

it("preserves the independent curve dimensions when the component becomes taller", () => {
  for (const theme of ["dark", "light"] as const) {
    const svg = graphSVG(fromDuration(0.5, 0.6), theme, "preview");
    expect(svg).toContain('width="340" height="112"');
    expect(svg).toContain("OVERSHOOT");
  }
});

it("keeps a one-line code block in every format including Unavailable", () => {
  const conversion = convert(".spring(duration: 0.5, bounce: 0.6)");
  for (const output of conversion.outputs) {
    const markdown = codePreview(output, conversion.easing);
    const lines = markdown.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^```/);
    expect(lines[1].length).toBeLessThanOrEqual(48);
  }
  expect(
    codePreview(
      conversion.outputs.find((o) => o.id === "css-bezier")!,
      conversion.easing,
    ),
  ).toContain("No Bézier equivalent: 5 crossings");
});
it("rounds display durations without changing physical values", () => {
  expect(durationLabel(fromDuration(0.5, 0.6))).toBe("1.53s · to settle");
  expect(durationLabel(fromDuration(0.5, 1))).toContain("not settled");
  expect(durationLabel({ kind: "bezier", points: [0, 0, 1, 1] })).toBe(
    "0.50s · assumed",
  );
});
it("renders a compact Curve at the GIF dimensions, preserving overshoot", () => {
  const easing = convert("linear(0, 0.35 20%, 1.15 55%, 1)").easing;
  for (const appearance of ["light", "dark"] as const) {
    const svg = graphSVG(easing, appearance, true);
    expect(svg).toContain('width="340" height="112"');
    expect(svg).toContain("+15.0% OVERSHOOT");
    expect(svg).toContain('stroke-dasharray="3 4"');
  }
});
