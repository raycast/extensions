import { describe, expect, it } from "vitest";
import { materializeSvgColorsForPreview } from "../svg-color-materialization";

describe("materializeSvgColorsForPreview", () => {
  it("resolves xychart series colors for preview rasterization", () => {
    const svg = `<svg style="--bg:#ffffff;--fg:#1f2328;--line:#d1d9e0;--accent:#0969da;--muted:#59636e">
<style>
  .xychart-title { fill: var(--_text); }
  svg {
    --_text: var(--fg);
    --_text-sec: var(--muted, color-mix(in srgb, var(--fg) 60%, var(--bg)));
    --_text-muted: var(--muted, color-mix(in srgb, var(--fg) 40%, var(--bg)));
    --_inner-stroke: color-mix(in srgb, var(--fg) 12%, var(--bg));
  }
</style>
<style>
  .xychart-line { fill: none; }
  .xychart-dot { stroke: var(--bg); }
  svg {
    --xychart-color-0: var(--accent, #3b82f6);
    --xychart-bar-fill-0: color-mix(in srgb, var(--bg) 75%, var(--xychart-color-0) 25%);
  }
  path.xychart-color-0, line.xychart-color-0 { stroke: var(--xychart-color-0); }
  circle.xychart-color-0 { fill: var(--xychart-color-0); }
</style>
<path class="xychart-line xychart-color-0" />
<circle class="xychart-dot xychart-color-0" />
</svg>`;

    const materialized = materializeSvgColorsForPreview(svg);

    expect(materialized).toContain("stroke: #0969da;");
    expect(materialized).toContain("fill: #0969da;");
    expect(materialized).not.toContain("var(--xychart-color-0)");
  });

  it("preserves the built-in xychart accent fallback when the root svg does not define --accent", () => {
    const svg = `<svg style="--bg:#ffffff;--fg:#27272a;background:var(--bg)">
<style>
  svg {
    --_text: var(--fg);
    --_text-sec: var(--muted, color-mix(in srgb, var(--fg) 60%, var(--bg)));
    --_text-muted: var(--muted, color-mix(in srgb, var(--fg) 40%, var(--bg)));
  }
</style>
<style>
  svg {
    --xychart-color-0: var(--accent, #3b82f6);
  }
  path.xychart-color-0 { stroke: var(--xychart-color-0); }
</style>
<path class="xychart-color-0" />
</svg>`;

    const materialized = materializeSvgColorsForPreview(svg);

    expect(materialized).toContain("stroke: #3b82f6;");
    expect(materialized).not.toContain("stroke: #535357;");
  });

  it("keeps a custom root accent when one is explicitly provided", () => {
    const svg = `<svg style="--bg:#ffffff;--fg:#27272a;--accent:#ff5500;background:var(--bg)">
<style>
  svg {
    --xychart-color-0: var(--accent, #3b82f6);
  }
  path.xychart-color-0 { stroke: var(--xychart-color-0); }
</style>
<path class="xychart-color-0" />
</svg>`;

    const materialized = materializeSvgColorsForPreview(svg);

    expect(materialized).toContain("stroke: #ff5500;");
  });
});
