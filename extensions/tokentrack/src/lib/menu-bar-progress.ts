import type { Image } from "@raycast/api";
import { chartFillHex } from "./chart-color";

const BAR_W = 96;
const BAR_H = 10;
const TRACK = "#3A3A3C";

/** Compact horizontal progress bar for MenuBarExtra.Item icons. */
export function menuBarProgressIcon(
  spend: number,
  cap: number,
  brandHex: string,
): Image.ImageLike {
  const pct = cap > 0 ? Math.min(spend / cap, 1) : 0;
  const fillW = pct > 0 ? Math.max(BAR_W * pct, 3) : 0;
  const fill = chartFillHex(brandHex);
  const r = BAR_H / 2;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_W}" height="${BAR_H}" viewBox="0 0 ${BAR_W} ${BAR_H}">`,
    `<rect width="${BAR_W}" height="${BAR_H}" rx="${r}" fill="${TRACK}" fill-opacity="0.9"/>`,
    fillW > 0
      ? `<rect width="${fillW.toFixed(1)}" height="${BAR_H}" rx="${r}" fill="${fill}"/>`
      : "",
    `</svg>`,
  ].join("");

  const b64 = Buffer.from(svg, "utf-8").toString("base64");
  return { source: `data:image/svg+xml;base64,${b64}` };
}
