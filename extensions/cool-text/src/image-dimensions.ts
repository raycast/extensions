const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_HEADER_BYTES = 24;
const PNG_HEADER_TYPE_OFFSET = 12;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const JPEG_START = 0xffd8;
const JPEG_MARKER_PREFIX = 0xff;
const JPEG_FRAME_MARKERS = new Set([0xc0, 0xc1, 0xc2]);
const JPEG_SCAN = 0xda;
const JPEG_END = 0xd9;
const SEGMENT_LENGTH_BYTES = 2;
const FRAME_HEADER_BYTES = 8;
const FRAME_HEIGHT_OFFSET = 3;
const FRAME_WIDTH_OFFSET = 5;

/** Read dimensions without inflating PNG data or allocating JPEG frame buffers. */
export function imageDimensions(buffer: Buffer) {
  if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    if (
      buffer.length < PNG_HEADER_BYTES ||
      buffer.toString("ascii", PNG_HEADER_TYPE_OFFSET, PNG_WIDTH_OFFSET) !== "IHDR"
    ) {
      throw new Error("Invalid PNG header.");
    }
    return { width: buffer.readUInt32BE(PNG_WIDTH_OFFSET), height: buffer.readUInt32BE(PNG_HEIGHT_OFFSET) };
  }
  if (buffer.length < SEGMENT_LENGTH_BYTES || buffer.readUInt16BE(0) !== JPEG_START) {
    throw new Error("Choose a PNG or JPEG image.");
  }
  let offset = SEGMENT_LENGTH_BYTES;
  while (offset < buffer.length) {
    if (buffer[offset++] !== JPEG_MARKER_PREFIX) break;
    while (buffer[offset] === JPEG_MARKER_PREFIX) offset++;
    const marker = buffer[offset++];
    if (marker === JPEG_SCAN || marker === JPEG_END || offset + SEGMENT_LENGTH_BYTES > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < SEGMENT_LENGTH_BYTES || offset + length > buffer.length) break;
    if (JPEG_FRAME_MARKERS.has(marker)) {
      if (length < FRAME_HEADER_BYTES) break;
      return {
        width: buffer.readUInt16BE(offset + FRAME_WIDTH_OFFSET),
        height: buffer.readUInt16BE(offset + FRAME_HEIGHT_OFFSET),
      };
    }
    offset += length;
  }
  throw new Error("Invalid or unsupported JPEG header.");
}
