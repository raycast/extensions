import type { ForecastResponse } from "../api/forecast-schema";
import { formatPercentage } from "./format-forecast";

/** Equal-size horizon cards for Raycast's Markdown detail pane. */
export function forecastChart(response: ForecastResponse, appearance: "light" | "dark"): string {
  const dark = appearance === "dark";
  const foreground = dark ? "#f5f5f5" : "#171717";
  const secondary = dark ? "#b2b2b8" : "#52525b";
  const surface = dark ? "#282b31" : "#000000";
  const surfaceOpacity = dark ? 1 : 0.035;
  const border = dark ? "#737b88" : "#b2b7bf";
  const track = dark ? "#474d58" : "#a1a6ad";
  const accent = dark ? "#64d8b0" : "#127552";
  const cards = [response.forecast?.score24h, response.forecast?.score48h].map((score, index) => {
    const x = index * 390;
    return `<g transform="translate(${x} 0)">
      <rect x="1" y="1" width="370" height="156" rx="14" fill="${surface}" fill-opacity="${surfaceOpacity}" stroke="${border}" stroke-width="2"/>
      <text x="22" y="36" font-size="22" font-weight="500" fill="${secondary}">WITHIN ${index === 0 ? 24 : 48} HOURS</text>
      <text x="22" y="108" font-size="58" font-weight="700" fill="${foreground}">${formatPercentage(score)}</text>
      <rect x="22" y="132" width="328" height="5" rx="2.5" fill="${track}"/>
      ${score != null && score > 0 ? `<rect x="22" y="132" width="${(328 * score) / 100}" height="5" rx="2.5" fill="${accent}"/>` : ""}
    </g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="762" height="160" viewBox="0 0 762 160" font-family="Helvetica, Arial, sans-serif">${cards.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
