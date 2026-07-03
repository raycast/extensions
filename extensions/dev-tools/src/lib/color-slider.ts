import {
  type ColorModel,
  type Rgba,
  channelDisplay,
  channelGradientHexes,
  channelsOf,
  modelString,
  toHex,
} from "./color";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Layout
const W = 700;
const PREVIEW = 120;
const BAR_X = 168;
const BAR_RIGHT = 596;
const BAR_W = BAR_RIGHT - BAR_X;
const BAR_H = 26;
const ROW_GAP = 42;
const TOP = 16;

/**
 * Render the full slider panel for one color model as an SVG data URI: a preview
 * swatch, one gradient bar per channel (with a handle and value readout), and the
 * format string. The image is independent of list selection so navigating channel
 * rows doesn't reload it (only an actual value change does) — that avoids flicker.
 */
export function renderColorPanel(c: Rgba, model: ColorModel): string {
  const channels = channelsOf(c, model);
  const fillHex = toHex(c, false);
  const panelH = TOP + channels.length * ROW_GAP + 44;
  const height = Math.max(panelH, PREVIEW + 64);

  const defs: string[] = [
    `<pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">` +
      `<rect width="16" height="16" fill="#ffffff"/><rect width="8" height="8" fill="#cfcfcf"/>` +
      `<rect x="8" y="8" width="8" height="8" fill="#cfcfcf"/></pattern>`,
  ];
  const body: string[] = [];

  channels.forEach((channel, i) => {
    const y = TOP + i * ROW_GAP;
    const id = `grad${i}`;
    const isAlpha = i === channels.length - 1;

    if (isAlpha) {
      defs.push(
        `<linearGradient id="${id}" x1="0" x2="1">` +
          `<stop offset="0" stop-color="${fillHex}" stop-opacity="0"/>` +
          `<stop offset="1" stop-color="${fillHex}" stop-opacity="1"/></linearGradient>`,
      );
    } else {
      const hexes = channelGradientHexes(c, model, i, 12);
      const stops = hexes
        .map((hex, s) => `<stop offset="${(s / (hexes.length - 1)).toFixed(3)}" stop-color="${hex}"/>`)
        .join("");
      defs.push(`<linearGradient id="${id}" x1="0" x2="1">${stops}</linearGradient>`);
    }

    if (isAlpha) {
      body.push(
        `<rect x="${BAR_X}" y="${y}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}" fill="url(#checker)"/>`,
      );
    }
    body.push(
      `<rect x="${BAR_X}" y="${y}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}" fill="url(#${id})" stroke="#00000044"/>`,
    );

    const t = clamp((channel.value - channel.min) / (channel.max - channel.min || 1), 0, 1);
    const hx = BAR_X + t * BAR_W;
    const cy = y + BAR_H / 2;
    body.push(
      `<rect x="${(hx - 6).toFixed(1)}" y="${y - 4}" width="12" height="${BAR_H + 8}" rx="6" fill="#ffffff" stroke="#00000066" stroke-width="1.5"/>`,
    );

    body.push(
      `<text x="${BAR_RIGHT + 18}" y="${cy + 5}" font-family="-apple-system,Helvetica,Arial" font-size="16" fill="#eaeaea">${esc(
        channelDisplay(channel),
      )}</text>`,
    );
  });

  const fy = TOP + channels.length * ROW_GAP + 2;
  body.push(
    `<rect x="${BAR_X}" y="${fy}" width="${BAR_W}" height="30" rx="8" fill="#1d1d1f" stroke="#00000055"/>` +
      `<text x="${BAR_X + BAR_W / 2}" y="${fy + 20}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="14" fill="#dcdcdc">${esc(
        modelString(c, model),
      )}</text>`,
  );

  const preview =
    `<rect x="16" y="16" width="${PREVIEW}" height="${PREVIEW}" rx="14" fill="url(#checker)"/>` +
    `<rect x="16" y="16" width="${PREVIEW}" height="${PREVIEW}" rx="14" fill="${fillHex}" fill-opacity="${c.a}"/>` +
    `<text x="${16 + PREVIEW / 2}" y="${16 + PREVIEW + 22}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="14" fill="#dcdcdc">${esc(
      toHex(c, c.a < 1),
    )}</text>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">` +
    `<defs>${defs.join("")}</defs>${preview}${body.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
