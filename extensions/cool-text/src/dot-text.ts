import { environment } from "@raycast/api";
import { Jimp, loadFont, measureText } from "jimp";
import { join } from "node:path";
import { IMAGE_WIDTHS, imageToDots } from "./image-art";

export const DOT_TEXT_DETAILS = { Compact: 4, Detailed: 3 } as const;
export type DotTextDetail = keyof typeof DOT_TEXT_DETAILS;
const PIXELS_PER_ROW = 8;
export const MAX_DOT_TEXT_LENGTH = 500;
const WHITE = 0xffffffff;
let fontPromise: ReturnType<typeof loadFont> | undefined;

export async function textToDots(text: string, detail: DotTextDetail = "Detailed") {
  const pixelsPerColumn = DOT_TEXT_DETAILS[detail];
  const maxLinePixels = IMAGE_WIDTHS.Detailed * pixelsPerColumn;
  const normalized = text.replace(/\r\n?/g, "\n");
  if (!normalized.trim()) return "";
  if (normalized.length > MAX_DOT_TEXT_LENGTH) {
    throw new Error(`Use up to ${MAX_DOT_TEXT_LENGTH} characters for Unicode dot text.`);
  }
  const font = await (fontPromise ??= loadFont(join(environment.assetsPath, "fonts/open-sans-64-black.fnt")));
  if (Array.from(normalized).some((character) => character !== "\n" && !font.chars[character])) {
    throw new Error("This dot font does not support some letters. Try English text or emoji.");
  }
  // Wrap before rasterizing so longer text keeps the same readable letter size.
  const lines: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    let line = "";
    for (const character of paragraph) {
      while (line && measureText(font, line + character) > maxLinePixels) {
        const space = line.lastIndexOf(" ");
        if (space > 0) {
          lines.push(line.slice(0, space + 1));
          line = line.slice(space + 1);
        } else {
          lines.push(line);
          line = "";
        }
      }
      line += character;
    }
    lines.push(line);
  }
  const height = Math.ceil(font.common.lineHeight / PIXELS_PER_ROW) * PIXELS_PER_ROW;
  const output: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      output.push("⠀");
      continue;
    }
    const columns = Math.max(1, Math.ceil(measureText(font, line) / pixelsPerColumn));
    const image = new Jimp({ width: columns * pixelsPerColumn, height, color: WHITE });
    // Each line already fits. Avoid the font library's long-word wrapping.
    image.print({ font, x: 0, y: 0, text: line });
    output.push(await imageToDots(await image.getBuffer("image/png"), columns));
  }
  return output.join("\n");
}
