// Only inspect frame boundaries; Node's native decoder handles compressed data.
// Format: https://github.com/facebook/zstd/blob/dev/doc/zstd_compression_format.md
export async function* zstdFrames(file) {
  const { size } = await file.stat();
  const header = Buffer.alloc(8);
  async function read(offset, length) {
    const { bytesRead } = await file.read(header, 0, length, offset);
    if (bytesRead !== length) throw new Error("Truncated Zstd frame");
    return header;
  }
  let offset = 0;
  while (offset < size) {
    const start = offset;
    const magic = (await read(offset, 4)).readUInt32LE(0);
    if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
      const length = (await read(offset + 4, 4)).readUInt32LE(0);
      offset += 8 + length;
      if (offset > size) throw new Error("Truncated Zstd metadata frame");
      continue;
    }
    if (magic !== 0xfd2fb528) throw new Error("Invalid Zstd frame magic");
    const descriptor = (await read(offset + 4, 1))[0];
    if (descriptor & 8) throw new Error("Reserved Zstd header bit is set");
    const singleSegment = Boolean(descriptor & 32);
    const contentSizeFlag = descriptor >> 6;
    const contentSizeBytes = contentSizeFlag === 0 ? Number(singleSegment) : 2 ** contentSizeFlag;
    const dictionaryBytes = [0, 1, 2, 4][descriptor & 3];
    offset += 5 + Number(!singleSegment) + dictionaryBytes + contentSizeBytes;
    let lastBlock;
    do {
      const block = (await read(offset, 3)).readUIntLE(0, 3);
      lastBlock = Boolean(block & 1);
      const type = (block >> 1) & 3;
      if (type === 3) throw new Error("Invalid Zstd block type");
      offset += 3 + (type === 1 ? 1 : block >> 3);
      if (offset > size) throw new Error("Truncated Zstd block");
    } while (!lastBlock);
    if (descriptor & 4) offset += 4;
    if (offset > size) throw new Error("Truncated Zstd checksum");
    yield { start, end: offset - 1 };
  }
  if (size === 0) throw new Error("Empty Zstd file");
}
