import path from "node:path";
import Jimp from "jimp";
import { environment } from "@raycast/api";

export type OverlayOpts = {
  basePng: Buffer;
  text?: string;
  marginPct?: number;
  invertIfDark?: boolean;
  fontSize?: "small" | "medium" | "large";
  fontStyle?: "sans" | "pixel";
};

// Raycast拡張内では import.meta.url 依存を避け、environment.assetsPath を利用
// assets/ ディレクトリは拡張ルート直下に配置される想定
const assetsDir = path.join(environment.assetsPath || "", ".");

const FONT_FILES = {
  small: {
    white: path.join(
      assetsDir,
      "fonts/open-sans-32-white/open-sans-32-white.fnt",
    ),
    black: path.join(
      assetsDir,
      "fonts/open-sans-32-black/open-sans-32-black.fnt",
    ),
  },
  medium: {
    white: path.join(
      assetsDir,
      "fonts/open-sans-64-white/open-sans-64-white.fnt",
    ),
    black: path.join(
      assetsDir,
      "fonts/open-sans-64-black/open-sans-64-black.fnt",
    ),
  },
  large: {
    white: path.join(
      assetsDir,
      "fonts/open-sans-64-white/open-sans-64-white.fnt",
    ),
    black: path.join(
      assetsDir,
      "fonts/open-sans-64-black/open-sans-64-black.fnt",
    ),
  },
} as const;

type FontSize = keyof typeof FONT_FILES;

// Jimp.loadFont は Font を返す。描画関数で Font が必要なためキャッシュ型を any で緩める
const fontCache = new Map<string, Promise<any>>();

function loadFont(filePath: string): Promise<any> {
  if (!fontCache.has(filePath)) {
    fontCache.set(filePath, Jimp.loadFont(filePath));
  }
  return fontCache.get(filePath)!;
}

export async function overlayLGTM({
  basePng,
  text = "LGTM",
  marginPct = 0.08,
  invertIfDark = true,
  fontSize = "large",
}: OverlayOpts): Promise<Buffer> {
  const image = await Jimp.read(basePng);
  const sizeKey: FontSize = fontSize in FONT_FILES ? fontSize : "large";

  const [fontWhite, fontBlack]: any[] = await Promise.all([
    loadFont(FONT_FILES[sizeKey].white),
    loadFont(FONT_FILES[sizeKey].black),
  ]);

  const useBlackText = invertIfDark
    ? (await calculateAverageLuminance(image)) > 140
    : false;
  const primaryFont = useBlackText ? fontBlack : fontWhite;
  const outlineFont = useBlackText ? fontWhite : fontBlack;

  const padding = Math.round(
    Math.min(image.getWidth(), image.getHeight()) * marginPct,
  );
  const maxWidth = image.getWidth() - padding * 2;
  const maxHeight = image.getHeight() - padding * 2;

  const textWidth = Jimp.measureText(primaryFont, text);
  const textHeight = Jimp.measureTextHeight(primaryFont, text, maxWidth);

  const textCanvas = new Jimp(
    textWidth + padding * 2,
    textHeight + padding * 2,
    0x00000000,
  );

  const render = (font: any, offsetX = 0, offsetY = 0) => {
    textCanvas.print(
      font,
      padding + offsetX,
      padding + offsetY,
      {
        text,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      maxWidth,
      maxHeight,
    );
  };

  const outlineOffsets = [
    [0, -4],
    [0, 4],
    [-4, 0],
    [4, 0],
    [-4, -4],
    [-4, 4],
    [4, -4],
    [4, 4],
  ];

  if (!useBlackText) {
    for (const [dx, dy] of outlineOffsets) {
      render(outlineFont, dx, dy);
    }
  }

  render(primaryFont);

  const targetWidth = Math.min(textCanvas.getWidth(), maxWidth);
  const targetHeight = Math.min(textCanvas.getHeight(), maxHeight);

  if (
    targetWidth !== textCanvas.getWidth() ||
    targetHeight !== textCanvas.getHeight()
  ) {
    textCanvas.scaleToFit(targetWidth, targetHeight);
  }

  const x = Math.round((image.getWidth() - textCanvas.getWidth()) / 2);
  const y = Math.round((image.getHeight() - textCanvas.getHeight()) / 2);

  image.composite(textCanvas, x, y, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacitySource: 1,
    opacityDest: 1,
  });

  return image.getBufferAsync(Jimp.MIME_PNG);
}

async function calculateAverageLuminance(img: Jimp): Promise<number> {
  const sample = img.clone().resize(64, 64, Jimp.RESIZE_BICUBIC);
  let luminance = 0;

  sample.scan(
    0,
    0,
    sample.getWidth(),
    sample.getHeight(),
    function (_x, _y, idx) {
      const r = this.bitmap.data[idx];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      luminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },
  );

  return luminance / (sample.getWidth() * sample.getHeight());
}

export async function createFallbackImage(
  text: string = "LGTM",
): Promise<Buffer> {
  const width = 1024;
  const height = 1024;
  const image = new Jimp(width, height, 0xff4fc3f7);

  const gradient = new Jimp(width, height, 0x00000000);
  for (let y = 0; y < height; y += 1) {
    const opacity = Math.floor((y / height) * 80);
    for (let x = 0; x < width; x += 1) {
      gradient.setPixelColor(Jimp.rgbaToInt(0, 100, 200, opacity), x, y);
    }
  }
  image.composite(gradient, 0, 0);

  const font: any = await loadFont(FONT_FILES.large.white);

  image.print(
    font,
    width * 0.1,
    height * 0.35,
    {
      text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    },
    width * 0.8,
    height * 0.3,
  );

  return image.getBufferAsync(Jimp.MIME_PNG);
}
