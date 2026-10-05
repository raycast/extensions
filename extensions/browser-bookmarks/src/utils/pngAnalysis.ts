import { inflateSync } from "zlib";

type PNGAnalysis = {
  hasOwnBackground: boolean;
  visibleLuminance: number;
};

const MAX_PNG_DIMENSION = 512;

function paethPredictor(left: number, above: number, upperLeft: number) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);

  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function relativeLuminance(red: number, green: number, blue: number) {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

function analyzePNGData(imageData: Uint8Array): PNGAnalysis | undefined {
  const png = Buffer.from(imageData);
  if (png.length < 33 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return undefined;

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;
  let palette: Buffer | undefined;
  let transparency: Buffer | undefined;
  const compressedChunks: Buffer[] = [];

  for (let offset = 8; offset + 12 <= png.length; ) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IDAT") {
      compressedChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  const channelsByColorType: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByColorType[colorType];
  if (
    !width ||
    !height ||
    width > MAX_PNG_DIMENSION ||
    height > MAX_PNG_DIMENSION ||
    bitDepth !== 8 ||
    interlaceMethod !== 0 ||
    !channels ||
    compressedChunks.length === 0
  ) {
    return undefined;
  }

  const rowLength = width * channels;
  const expectedLength = height * (rowLength + 1);
  const inflated = inflateSync(Buffer.concat(compressedChunks), { maxOutputLength: expectedLength });
  if (inflated.length !== expectedLength) return undefined;

  const pixels = Buffer.alloc(height * rowLength);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowLength;
    const previousRowOffset = rowOffset - rowLength;

    for (let x = 0; x < rowLength; x += 1) {
      const encoded = inflated[sourceOffset + x];
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
      const above = y > 0 ? pixels[previousRowOffset + x] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[previousRowOffset + x - channels] : 0;

      switch (filter) {
        case 0:
          pixels[rowOffset + x] = encoded;
          break;
        case 1:
          pixels[rowOffset + x] = (encoded + left) & 0xff;
          break;
        case 2:
          pixels[rowOffset + x] = (encoded + above) & 0xff;
          break;
        case 3:
          pixels[rowOffset + x] = (encoded + Math.floor((left + above) / 2)) & 0xff;
          break;
        case 4:
          pixels[rowOffset + x] = (encoded + paethPredictor(left, above, upperLeft)) & 0xff;
          break;
        default:
          return undefined;
      }
    }

    sourceOffset += rowLength;
  }

  let visiblePixels = 0;
  let alphaSum = 0;
  let luminanceSum = 0;
  const touchedEdges = new Set<string>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 255;

      if (colorType === 0 || colorType === 4) {
        red = green = blue = pixels[offset];
        if (colorType === 4) alpha = pixels[offset + 1];
      } else if (colorType === 2 || colorType === 6) {
        red = pixels[offset];
        green = pixels[offset + 1];
        blue = pixels[offset + 2];
        if (colorType === 6) alpha = pixels[offset + 3];
      } else {
        const paletteOffset = pixels[offset] * 3;
        if (!palette || paletteOffset + 2 >= palette.length) continue;
        red = palette[paletteOffset];
        green = palette[paletteOffset + 1];
        blue = palette[paletteOffset + 2];
        alpha = transparency?.[pixels[offset]] ?? 255;
      }

      if (alpha < 32) continue;

      const alphaWeight = alpha / 255;
      visiblePixels += 1;
      alphaSum += alphaWeight;
      luminanceSum += relativeLuminance(red, green, blue) * alphaWeight;

      if (x <= 1) touchedEdges.add("left");
      if (x >= width - 2) touchedEdges.add("right");
      if (y <= 1) touchedEdges.add("top");
      if (y >= height - 2) touchedEdges.add("bottom");
    }
  }

  if (visiblePixels === 0 || alphaSum === 0) return undefined;

  const coverage = visiblePixels / (width * height);
  return {
    hasOwnBackground: coverage >= 0.58 && touchedEdges.size >= 3,
    visibleLuminance: luminanceSum / alphaSum,
  };
}

export function analyzePNG(imageData: Uint8Array): PNGAnalysis | undefined {
  try {
    return analyzePNGData(imageData);
  } catch {
    return undefined;
  }
}
