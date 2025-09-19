const path = require("node:path");
const Jimp = require("jimp");

const assetsDir = path.resolve(__dirname, "../../assets");
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
};

const fontCache = new Map();

function loadFont(fontPath) {
  if (!fontCache.has(fontPath)) {
    fontCache.set(fontPath, Jimp.loadFont(fontPath));
  }
  return fontCache.get(fontPath);
}

async function overlayLGTM({
  basePng,
  text = "LGTM",
  marginPct = 0.08,
  invertIfDark = true,
  fontSize = "large",
}) {
  const img = await Jimp.read(basePng);
  const width = img.getWidth();
  const height = img.getHeight();

  const selectedFonts = FONT_FILES[fontSize] || FONT_FILES.large;

  const avgLuminance = await calculateAverageLuminance(img);
  const useBlackText = invertIfDark && avgLuminance > 140;

  const [fontWhite, fontBlack] = await Promise.all([
    loadFont(selectedFonts.white),
    loadFont(selectedFonts.black),
  ]);
  const primaryFont = useBlackText ? fontBlack : fontWhite;
  const outlineFont = useBlackText ? fontWhite : fontBlack;

  const padding = Math.round(Math.min(width, height) * marginPct);
  const textAreaWidth = width - padding * 2;
  const textAreaHeight = height - padding * 2;

  const textWidth = Jimp.measureText(primaryFont, text);
  const textHeight = Jimp.measureTextHeight(primaryFont, text, textAreaWidth);

  const x = Math.floor((width - textWidth) / 2);
  const y = Math.floor((height - textHeight) / 2);

  if (!useBlackText) {
    const outline = new Jimp(width, height, 0x00000000);
    const offsets = [
      [-4, -4],
      [-4, 4],
      [4, -4],
      [4, 4],
      [0, -4],
      [0, 4],
      [-4, 0],
      [4, 0],
    ];
    for (const [dx, dy] of offsets) {
      outline.print(
        outlineFont,
        x + dx,
        y + dy,
        {
          text,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        },
        textAreaWidth,
        textAreaHeight,
      );
    }
    img.composite(outline, 0, 0, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.7,
      opacityDest: 1,
    });
  }

  img.print(
    primaryFont,
    x,
    y,
    {
      text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    },
    textAreaWidth,
    textAreaHeight,
  );

  return img.getBufferAsync(Jimp.MIME_PNG);
}

async function calculateAverageLuminance(img) {
  const sample = img.clone().resize(64, 64);
  let total = 0;
  const pixels = sample.getWidth() * sample.getHeight();

  sample.scan(
    0,
    0,
    sample.getWidth(),
    sample.getHeight(),
    function (x, y, idx) {
      const r = this.bitmap.data[idx];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },
  );

  return total / pixels;
}

async function createFallbackImage(text = "LGTM") {
  const width = 1024;
  const height = 1024;
  const img = new Jimp(width, height, 0xff4fc3f7);

  const gradientOverlay = new Jimp(width, height, 0x00000000);
  for (let y = 0; y < height; y += 1) {
    const opacity = Math.floor((y / height) * 60);
    for (let x = 0; x < width; x += 1) {
      gradientOverlay.setPixelColor(Jimp.rgbaToInt(0, 100, 200, opacity), x, y);
    }
  }
  img.composite(gradientOverlay, 0, 0);

  const font = await loadFont(FONT_FILES.large.white);

  img.print(
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

  return img.getBufferAsync(Jimp.MIME_PNG);
}

module.exports = {
  overlayLGTM,
  createFallbackImage,
};
