import { parse } from "./lib/parse.ts";
import { plotPoints } from "./lib/model.ts";
import { palettes } from "./lib/graph.ts";

// Separate from Figma: these names resolve through the verified CSS keyword parser.
export const CSS_PRESETS = [
  { name: "Linear", input: "linear" },
  { name: "Ease In", input: "ease-in" },
  { name: "Ease Out", input: "ease-out" },
  { name: "Ease In Out", input: "ease-in-out" },
  { name: "Ease", input: "ease" },
] as const;

// Platform names are provenance, not claims that these curves are interchangeable.
// Back Out: motion-utils 12.23.24 easing/back.mjs; no spring-to-Bézier fit.
export const PRESET_GROUPS = [
  {
    title: "CSS · Standard",
    source: "CSS specification",
    items: CSS_PRESETS.map((p) => ({ ...p, use: "Standard timing" })),
  },
  {
    title: "Motion · Expressive",
    source: "Motion · exact Bézier",
    items: [
      {
        name: "Back Out",
        input: "cubic-bezier(0.33, 1.53, 0.69, 0.99)",
        use: "Arrival · overshoot",
      },
      {
        name: "Back In",
        input: "cubic-bezier(0.31, 0.01, 0.67, -0.53)",
        use: "Exit · anticipation",
      },
    ],
  },
  // Authored physical presets, deliberately NOT Figma's Gentle/Quick/Bouncy/Slow.
  // Duration here is the Apple parameter; settling time is reported separately.
  {
    title: "Rosetta · Physical Springs",
    source: "Rosetta · physical spring",
    items: [
      {
        name: "Precise",
        input: ".spring(duration: 0.3, bounce: 0)",
        use: "Controls · no rebound",
      },
      {
        name: "Soft Landing",
        input: ".spring(duration: 0.5, bounce: 0.15)",
        use: "Panels · restrained",
      },
      {
        name: "Responsive",
        input: ".spring(duration: 0.3, bounce: 0.25)",
        use: "Short travel · quick",
      },
      {
        name: "Expressive",
        input: ".spring(duration: 0.5, bounce: 0.4)",
        use: "Long travel · rebound",
      },
      {
        name: "Playful",
        input: ".spring(duration: 0.5, bounce: 0.6)",
        use: "Stress test · repeated crossings",
      },
      {
        name: "Slow Settle",
        input: ".spring(duration: 0.8, bounce: 0.3)",
        use: "Large surfaces · deliberate",
      },
    ],
  },
];
export const BROWSE_PRESETS = PRESET_GROUPS.flatMap((group) =>
  group.items.map((p) => ({ ...p, source: group.source })),
);

// Figma preset values are not verified; do not substitute similarly named CSS values.
export function presetIcon(input: string, appearance: "light" | "dark") {
  const points = plotPoints(parse(input).easing, 32);
  const low = Math.min(0, ...points.map((p) => p.y));
  const high = Math.max(1, ...points.map((p) => p.y));
  const d = points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${(3 + 26 * p.x).toFixed(2)},${(29 - (26 * (p.y - low)) / (high - low)).toFixed(2)}`,
    )
    .join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M3 3V29H29" fill="none" stroke="${palettes[appearance].grid}"/><path d="${d}" fill="none" stroke="${palettes[appearance].curve}" stroke-width="2" stroke-linecap="round"/></svg>`;
  return {
    source: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  };
}
