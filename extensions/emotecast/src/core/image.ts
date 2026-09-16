export type ImageInfo = { width: number; height: number; format: string };

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString("latin1");
}

function webpInfo(buffer: Buffer): ImageInfo | undefined {
  const chunk = ascii(buffer, 12, 16);

  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
      format: "webp",
    };
  }

  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      format: "webp",
    };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: "webp",
    };
  }

  return undefined;
}

export function readImageInfo(buffer: Buffer): ImageInfo | undefined {
  if (buffer.length >= 10 && ascii(buffer, 0, 3) === "GIF") {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
      format: "gif",
    };
  }

  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      format: "png",
    };
  }

  if (
    buffer.length >= 30 &&
    ascii(buffer, 0, 4) === "RIFF" &&
    ascii(buffer, 8, 12) === "WEBP"
  ) {
    return webpInfo(buffer);
  }

  return undefined;
}
