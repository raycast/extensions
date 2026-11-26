import { environment } from "@raycast/api";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { RGB, toHex } from "./color";

const PREVIEW_DIR = join(environment.supportPath, "previews");
const WIDTH = 640;
const SAMPLE = "The quick brown fox jumps over the lazy dog";
const SHORT_SAMPLE = "Aa Bb Cc 123";

let cleaned = false;

/** Removes previews from earlier sessions so the folder does not grow forever. */
function ensureDir() {
  if (!cleaned) {
    rmSync(PREVIEW_DIR, { recursive: true, force: true });
    cleaned = true;
  }
  if (!existsSync(PREVIEW_DIR)) mkdirSync(PREVIEW_DIR, { recursive: true });
}

/**
 * Writes an SVG card that shows the text color on the background at the chosen size and weight,
 * and returns a Markdown image for it.
 */
export function previewImage(label: string, fg: RGB, bg: RGB, sizePx: number, weight: number): string {
  ensureDir();
  const fgHex = toHex(fg);
  const bgHex = toHex(bg);
  const sample = Math.min(sizePx, 48);
  const height = Math.round(48 + 22 + 16 + sample * 1.3 + 32);
  const file = join(
    PREVIEW_DIR,
    `${label.replace(/\W+/g, "-")}-${fgHex.slice(1)}-${bgHex.slice(1)}-${sizePx}-${weight}.svg`,
  );

  // Long sample when it fits in one line (about 0.52em per character), short sample otherwise.
  const text = SAMPLE.length * sample * 0.52 <= WIDTH - 56 ? SAMPLE : SHORT_SAMPLE;

  if (!existsSync(file)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="14" fill="${bgHex}" stroke="#8884" />
  <g fill="${fgHex}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif">
    <text x="28" y="56" font-size="22" font-weight="600">${escapeXml(label)}</text>
    <text x="28" y="${Math.round(56 + 16 + sample * 1.05)}" font-size="${sample}" font-weight="${weight}">${text}</text>
  </g>
</svg>`;
    writeFileSync(file, svg);
  }

  return `![${escapeMarkdown(label)}](${pathToFileURL(file).href}?raycast-width=${WIDTH}&raycast-height=${height})`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function escapeMarkdown(value: string): string {
  return value.replace(/[[\]]/g, "");
}
