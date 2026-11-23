export interface ImageSize {
  width: number;
  height: number;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function pngSize(bytes: Uint8Array): ImageSize | undefined {
  if (bytes.length < 24 || bytes[0] !== 0x89 || ascii(bytes, 1, 3) !== "PNG") return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function webpSize(bytes: Uint8Array): ImageSize | undefined {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return undefined;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    return {
      width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
      height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
    };
  }
  if (chunk === "VP8L") {
    const [b0, b1, b2, b3] = bytes.subarray(21, 25);
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8 ") {
    return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
  }
  return undefined;
}

function svgSize(bytes: Uint8Array): ImageSize | undefined {
  const text = new TextDecoder().decode(bytes.subarray(0, 4096));
  const tag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return undefined;
  const viewBox = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  const width = tag.match(/\bwidth\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
  const height = tag.match(/\bheight\s*=\s*["']\s*([\d.]+)(?:px)?\s*["']/i);
  if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
  return undefined;
}

/** Reads the intrinsic size of a PNG, WebP or SVG file from its bytes. */
export function imageSize(bytes: Uint8Array): ImageSize | undefined {
  const size = pngSize(bytes) ?? webpSize(bytes) ?? svgSize(bytes);
  return size && size.width > 0 && size.height > 0 ? size : undefined;
}

/** Scales size to fit inside box, keeping its aspect ratio. Without a size, the box's square is used. */
export function fitInto(size: ImageSize | undefined, box: ImageSize): ImageSize {
  const source = size ?? { width: 1, height: 1 };
  const scale = Math.min(box.width / source.width, box.height / source.height);
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}
