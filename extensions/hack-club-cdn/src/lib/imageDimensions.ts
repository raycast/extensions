export interface ImageDimensions {
  width: number;
  height: number;
}

export function getImageDimensions(buffer: Buffer): ImageDimensions | undefined {
  return parsePngDimensions(buffer) ?? parseJpegDimensions(buffer) ?? parseWebpDimensions(buffer);
}

function parsePngDimensions(buffer: Buffer): ImageDimensions | undefined {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return undefined;
  }
  // IHDR is always the first chunk, immediately after the 8-byte signature and the
  // 8-byte chunk header (4-byte length + 4-byte "IHDR" type): width at offset 16, height at 20,
  // both big-endian uint32.
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function parseJpegDimensions(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) {
    return undefined;
  }
  let offset = 2;
  while (offset + 9 <= buffer.length) {
    if (buffer.readUInt8(offset) !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer.readUInt8(offset + 1);
    // SOF0-SOF15 markers (0xC0-0xCF) EXCEPT 0xC4 (DHT), 0xC8 (JPG, reserved), 0xCC (DAC) carry
    // the frame dimensions.
    const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSofMarker) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      // Markers with no payload length field (SOI, EOI, RSTn) - just advance past the marker.
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }
  return undefined;
}

function parseWebpDimensions(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 30) {
    return undefined;
  }
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return undefined;
  }

  const fourCC = buffer.toString("ascii", 12, 16);

  // VP8X: extended format container, used for alpha/animation/metadata. Canvas width/height are
  // 3-byte little-endian (value - 1) fields at offsets 24 and 27 (payload starts at offset 20;
  // byte 20 is a flags byte, bytes 21-23 are reserved).
  if (fourCC === "VP8X") {
    const width = buffer.readUIntLE(24, 3) + 1;
    const height = buffer.readUIntLE(27, 3) + 1;
    return { width, height };
  }

  // VP8L: lossless format. Payload byte 20 must be the signature byte 0x2f. Bytes 21-24 pack a
  // little-endian uint32: bits 0-13 = (width - 1), bits 14-27 = (height - 1).
  if (fourCC === "VP8L") {
    if (buffer.readUInt8(20) !== 0x2f) {
      return undefined;
    }
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  // VP8 (note trailing space): lossy format, payload is a VP8 bitstream. Bytes 20-22 are a 3-byte
  // frame tag (ignored), bytes 23-25 must be the VP8 start code 0x9d 0x01 0x2a. Bytes 26-27 and
  // 28-29 are little-endian uint16s where the low 14 bits are width/height (top 2 bits are a
  // scale factor, ignored).
  if (fourCC === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return undefined;
    }
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }

  return undefined;
}
