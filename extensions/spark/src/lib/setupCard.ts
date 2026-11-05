// The setup screen's card, drawn like Raycast's own "set up this extension"
// screen: the app icon, the extension's name, a line of explanation, then
// numbered steps - centered, which only an image alone on its line can be in
// a Detail view.
//
// No Raycast imports here: this file runs under `node --test` as-is.

import { FONT, escapeXML, textWidth, toDataURI } from "./avatar.ts";

const WIDTH = 600;
const ICON = 96;
const TITLE_SIZE = 26;
const TEXT_SIZE = 15;
const LINE_HEIGHT = 22;
const STEP_HEIGHT = 30;
const NUMBER_WIDTH = 26;

export interface SetupCardOptions {
  /// The app icon as base64 PNG.
  icon?: string;
  title: string;
  intro: string;
  steps: string[];
  dark: boolean;
}

/// Breaks `text` into lines no wider than `maxWidth`.
export function wrap(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, fontSize) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function setupCardSVG({ icon, title, intro, steps, dark }: SetupCardOptions): {
  uri: string;
  width: number;
  height: number;
} {
  const primary = dark ? "#FFFFFF" : "#1D1D1F";
  const secondary = dark ? "#A1A1A6" : "#6E6E73";
  const cx = WIDTH / 2;
  const titleY = ICON + 44;
  const introLines = wrap(intro, WIDTH - 40, TEXT_SIZE);
  const introY = titleY + 36;
  const stepsTop = introY + (introLines.length - 1) * LINE_HEIGHT + 44;
  // The steps read as a left-aligned list, centered as a block.
  const stepsWidth = NUMBER_WIDTH + Math.max(0, ...steps.map((step) => textWidth(step, TEXT_SIZE)));
  const stepsX = Math.max(20, cx - stepsWidth / 2);
  const height = steps.length ? stepsTop + (steps.length - 1) * STEP_HEIGHT + 12 : introY + 12;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">` +
    (icon
      ? `<image x="${cx - ICON / 2}" y="0" width="${ICON}" height="${ICON}" href="data:image/png;base64,${icon}"/>`
      : "") +
    `<text x="${cx}" y="${titleY}" text-anchor="middle" font-family="${FONT}" font-size="${TITLE_SIZE}" font-weight="700" fill="${primary}">${escapeXML(title)}</text>` +
    introLines
      .map(
        (line, index) =>
          `<text x="${cx}" y="${introY + index * LINE_HEIGHT}" text-anchor="middle" font-family="${FONT}" font-size="${TEXT_SIZE}" fill="${secondary}">${escapeXML(line)}</text>`,
      )
      .join("") +
    steps
      .map((step, index) => {
        const y = stepsTop + index * STEP_HEIGHT;
        return (
          `<text x="${stepsX}" y="${y}" font-family="${FONT}" font-size="${TEXT_SIZE}" font-weight="600" fill="${secondary}">${index + 1}.</text>` +
          `<text x="${stepsX + NUMBER_WIDTH}" y="${y}" font-family="${FONT}" font-size="${TEXT_SIZE}" fill="${primary}">${escapeXML(step)}</text>`
        );
      })
      .join("") +
    `</svg>`;
  return { uri: toDataURI(svg), width: WIDTH, height };
}
