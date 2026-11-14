import {
  formatNumber as n,
  plotPoints,
  springWindow,
  type Easing,
} from "./model.ts";

export const GRAPH_WIDTH = 340;
export const GRAPH_HEIGHT = 216;
export const palettes = {
  dark: {
    background: "#1c2029",
    grid: "#323947",
    label: "#a7b2c6",
    text: "#ecf0f8",
    curve: "#a5a0ff",
    glow: "#7974ec",
    goal: "#98baae",
    amber: "#ffc17e",
    border: "#353b49",
  },
  light: {
    background: "#f4f5fa",
    grid: "#dee2eb",
    label: "#59657b",
    text: "#252b3c",
    curve: "#5543c4",
    glow: "#7661d6",
    goal: "#407361",
    amber: "#a9520b",
    border: "#dce0ea",
  },
};

export function graphSVG(
  e: Easing,
  appearance: "dark" | "light",
  compact: boolean | "strip" | "preview" = false,
): string {
  const height =
    compact === "preview"
      ? 112
      : compact === "strip"
        ? 76
        : compact
          ? 112
          : GRAPH_HEIGHT;
  const p = palettes[appearance];
  const pts = plotPoints(
    e,
    e.kind === "spring"
      ? Math.min(
          1024,
          Math.max(240, Math.ceil(e.omega0 * springWindow(e).seconds * 8)),
        )
      : 240,
  );
  const low = Math.min(0, ...pts.map((p) => p.y)),
    high = Math.max(1, ...pts.map((p) => p.y));
  const overshoot = high > 1.001,
    undershoot = low < -0.001;
  const min = low - (high - low) * 0.06,
    max = high + (high - low) * 0.13;
  const left = 36,
    right = 320,
    top = compact ? 28 : 40,
    bottom =
      compact === "preview"
        ? 88
        : compact === "strip"
          ? 56
          : compact
            ? 88
            : 178;
  const x = (t: number) => left + t * (right - left);
  const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
  const xy = (t: number, v: number) => `${n(x(t))},${n(y(v))}`;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${xy(p.x, p.y)}`).join(" ");
  const peak = pts.reduce((a, b) => (a.y > b.y ? a : b));
  const duration =
    e.kind === "spring" ? `${springWindow(e).seconds.toFixed(2)}s` : "100%";
  const label =
    e.kind === "spring"
      ? "SPRING RESPONSE"
      : e.kind === "bezier"
        ? "BÉZIER RESPONSE"
        : e.kind === "steps"
          ? "STEP RESPONSE"
          : "LINEAR RESPONSE";
  const headline = overshoot
    ? `+${((high - 1) * 100).toFixed(1)}% OVERSHOOT`
    : undershoot
      ? `${(low * 100).toFixed(1)}% UNDERSHOOT`
      : "0 → 1";
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (t) =>
        `<path d="M${xy(t, min)} V${top}"/><path d="M${xy(0, t)} H${right}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GRAPH_WIDTH}" height="${height}" viewBox="0 0 ${GRAPH_WIDTH} ${height}">
<defs>
  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p.glow}" stop-opacity=".22"/><stop offset="1" stop-color="${p.glow}" stop-opacity=".015"/></linearGradient>
  <clipPath id="plot"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/></clipPath>
  <clipPath id="above"><rect x="${left}" y="${top}" width="${right - left}" height="${Math.max(0, y(1) - top)}"/></clipPath>
</defs>
<rect x=".5" y=".5" width="339" height="${height - 1}" rx="14" fill="${p.background}" stroke="${p.border}"/>
<g font-family="-apple-system, BlinkMacSystemFont, sans-serif">
<text x="17" y="${compact ? 17 : 26}" fill="${p.label}" font-size="9" font-weight="600" letter-spacing="1.05">${label}</text>
<text x="322" y="${compact ? 17 : 26}" text-anchor="end" fill="${overshoot || undershoot ? p.amber : p.text}" font-size="9" font-weight="600">${headline}</text>
<g clip-path="url(#plot)">
${overshoot ? `<rect x="${left}" y="${top}" width="${right - left}" height="${n(y(1) - top)}" fill="${p.amber}" opacity=".06"/>` : ""}
<g stroke="${p.grid}" stroke-width=".6" fill="none">${grid}</g>
<path d="${path} L${xy(1, min)} L${xy(0, min)} Z" fill="url(#area)"/>
<path d="M${xy(0, 1)} H${right}" stroke="${p.goal}" stroke-width="1" stroke-dasharray="3 4" opacity=".85"/>
<path d="${path}" fill="none" stroke="${p.glow}" stroke-width="7" opacity=".10" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="${p.curve}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="${p.amber}" stroke-width="2.4" clip-path="url(#above)" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<circle cx="${n(x(0))}" cy="${n(y(pts[0].y))}" r="3" fill="${p.background}" stroke="${p.curve}" stroke-width="1.5"/>
<circle cx="${n(x(1))}" cy="${n(y(pts.at(-1)!.y))}" r="3" fill="${p.curve}"/>
${overshoot ? `<circle cx="${n(x(peak.x))}" cy="${n(y(peak.y))}" r="3" fill="${p.background}" stroke="${p.amber}" stroke-width="1.5"/>` : ""}
<g fill="${p.label}" font-size="9" font-variant-numeric="tabular-nums">
<text x="26" y="${n(y(1) + 3)}" text-anchor="end">1</text>
<text x="26" y="${n(y(0.5) + 3)}" text-anchor="end">½</text>
<text x="26" y="${n(y(0) + 3)}" text-anchor="end">0</text>
<text x="36" y="${height - 10}">0</text><text x="178" y="${height - 10}" text-anchor="middle">TIME</text><text x="320" y="${height - 10}" text-anchor="end">${duration}</text>
</g>
</g></svg>`;
}

export function graphMarkdown(
  e: Easing,
  appearance: "dark" | "light",
  compact: boolean | "strip" | "preview" = false,
) {
  const svg = graphSVG(e, appearance, compact);
  return `![Easing response curve](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${GRAPH_WIDTH}&raycast-height=${compact === "preview" ? 112 : compact === "strip" ? 76 : compact ? 112 : GRAPH_HEIGHT})`;
}
