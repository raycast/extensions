import { environment } from "@raycast/api";
import { Jimp, loadFont, measureText, measureTextHeight } from "jimp";
import { join } from "node:path";
import { IMAGE_WIDTHS, imageToDots } from "./image-art";

const MAX_TEXT_PIXELS = 768;
const PIXELS_PER_COLUMN = 4;
const WHITE = 0xffffffff;
let fontPromise: ReturnType<typeof loadFont> | undefined;

export async function textToDots(text: string) {
  const font = await (fontPromise ??= loadFont(join(environment.assetsPath, "fonts/open-sans-64-black.fnt")));
  if (Array.from(text).some((character) => character !== "\n" && character !== "\r" && !font.chars[character])) {
    throw new Error("This dot font does not support some letters. Try English text or emoji.");
  }
  const width = Math.max(1, Math.min(MAX_TEXT_PIXELS, measureText(font, text)));
  const height = Math.max(1, measureTextHeight(font, text, width));
  const image = new Jimp({ width, height, color: WHITE });
  image.print({ font, x: 0, y: 0, text, maxWidth: width });
  return imageToDots(
    await image.getBuffer("image/png"),
    Math.min(IMAGE_WIDTHS.Detailed, Math.max(1, Math.ceil(width / PIXELS_PER_COLUMN))),
  );
}
