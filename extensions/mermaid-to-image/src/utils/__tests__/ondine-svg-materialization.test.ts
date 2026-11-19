import { describe, expect, it } from "vitest";
import { materializeSvgColorsForPreview } from "../svg-color-materialization";

describe("Ondine SVG materialization", () => {
  const svg = `<svg class="ondine" style="--_bg:var(--ondine-bg,#fff);--_fg:var(--ondine-fg,#000);--_a:var(--ondine-surface-alt,color-mix(in srgb,var(--_fg) 20%,var(--_bg)));--_sw:var(--ondine-stroke,2px);--_r:var(--ondine-radius,0);font-family:var(--ondine-font,Menlo, 'Liberation Mono', monospace);stroke-width:var(--_sw)"><rect fill="var(--_a)" rx="var(--_r)"/><text>var(--_fg) &amp; label</text></svg>`;

  it("resolves nested aliases and implicit color-mix percentages without treating fonts or lengths as colors", () => {
    const result = materializeSvgColorsForPreview(svg);
    expect(result).toContain('fill="#cccccc"');
    expect(result).toContain('rx="0"');
    expect(result).toContain("stroke-width:2px");
    expect(result).toContain("font-family:Menlo, 'Liberation Mono', monospace");
    expect(result).toContain("<text>var(--_fg) &amp; label</text>");
    expect(materializeSvgColorsForPreview(result)).toBe(result);
  });

  it("uses explicit themed variables rather than overwriting them with Beautiful defaults", () => {
    const result = materializeSvgColorsForPreview(
      svg.replace('style="', 'style="--ondine-fg:#ffffff;--ondine-bg:#000000;'),
    );
    expect(result).toContain('fill="#333333"');
  });

  it("preserves explicit element styles, escaped attributes and diagram text", () => {
    const input = `<svg class="ondine" style="--_fg:#123456"><path fill="#abcdef" stroke="red" style="stroke-width:3px;opacity:0.5"/><text font-family="A &amp; B" aria-label="&quot;safe&quot;">&lt;script&gt; &amp; var(--_fg)</text></svg>`;
    expect(materializeSvgColorsForPreview(input)).toBe(input);
  });

  it("rejects excessive alias depth and expansion", () => {
    const aliases = Array.from({ length: 40 }, (_, i) => `--v${i}:var(--v${i + 1})`).join(";");
    expect(() => materializeSvgColorsForPreview(`<svg class="ondine" style="${aliases};--v40:#fff"/>`)).toThrow(
      /limit/,
    );
    const expanding = Array.from({ length: 25 }, (_, i) => `--v${i}:var(--v${i + 1})var(--v${i + 1})`).join(";");
    expect(() => materializeSvgColorsForPreview(`<svg class="ondine" style="${expanding};--v25:#fff"/>`)).toThrow(
      /limit/,
    );
  });

  it.each(["--_fg:var(--missing)", "--_fg:var(--_bg);--_bg:var(--_fg)"])(
    "rejects unresolved or cyclic expressions rather than creating black fallback output: %s",
    (style) => {
      expect(() =>
        materializeSvgColorsForPreview(`<svg class="ondine" style="${style}" fill="var(--_fg)"/>`),
      ).toThrow();
    },
  );
});
