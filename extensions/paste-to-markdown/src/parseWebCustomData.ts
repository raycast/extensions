const PICKLE_HEADER_SIZE = 4;

function alignUp4(n: number): number {
  return (n + 3) & ~3;
}

function readString16(buf: Buffer, offset: number): { value: string; nextOffset: number } | null {
  if (offset + 4 > buf.length) return null;

  const charCount = buf.readUInt32LE(offset);
  const byteCount = charCount * 2;
  const dataStart = offset + 4;
  const dataEnd = dataStart + byteCount;

  if (dataEnd > buf.length) return null;

  const value = buf.subarray(dataStart, dataEnd).toString("utf16le");
  const nextOffset = dataStart + alignUp4(byteCount);

  return { value, nextOffset };
}

export function parseWebCustomData(blob: Buffer): Map<string, string> | null {
  if (blob.length < PICKLE_HEADER_SIZE + 4) return null;

  const payloadSize = blob.readUInt32LE(0);
  const payloadEnd = PICKLE_HEADER_SIZE + payloadSize;

  if (payloadEnd > blob.length) return null;

  let offset = PICKLE_HEADER_SIZE;
  const entryCount = blob.readUInt32LE(offset);
  offset += 4;

  if (entryCount > 1000) return null;

  const result = new Map<string, string>();

  for (let i = 0; i < entryCount; i++) {
    const keyResult = readString16(blob, offset);
    if (keyResult === null) return null;
    offset = keyResult.nextOffset;

    const valueResult = readString16(blob, offset);
    if (valueResult === null) return null;
    offset = valueResult.nextOffset;

    result.set(keyResult.value, valueResult.value);
  }

  return result;
}
