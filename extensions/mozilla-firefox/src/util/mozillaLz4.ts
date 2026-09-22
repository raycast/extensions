const MAGIC = Buffer.from("mozLz40\0");

export function decodeMozillaLz4(buf: Buffer): string {
  if (buf.length < 12 || !buf.subarray(0, 8).equals(MAGIC)) {
    throw new Error("Not a mozilla lz4 file");
  }
  const expectedSize = buf.readUInt32LE(8);
  return lz4BlockDecompress(buf.subarray(12), expectedSize).toString("utf8");
}

function lz4BlockDecompress(src: Buffer, expectedSize: number): Buffer {
  const dst = Buffer.alloc(expectedSize);
  let s = 0;
  let d = 0;

  while (s < src.length) {
    const token = src[s++];
    let litLen = token >> 4;
    if (litLen === 15) {
      let extra: number;
      do {
        if (s >= src.length) throw new Error("truncated lz4");
        extra = src[s++];
        litLen += extra;
      } while (extra === 255);
    }
    if (s + litLen > src.length || d + litLen > dst.length) throw new Error("truncated lz4");
    src.copy(dst, d, s, s + litLen);
    s += litLen;
    d += litLen;
    if (s >= src.length) break;
    if (s + 2 > src.length) throw new Error("truncated lz4");
    const offset = src[s] | (src[s + 1] << 8);
    s += 2;
    if (offset === 0 || offset > d) throw new Error("bad lz4 offset");
    let matchLen = (token & 0x0f) + 4;
    if ((token & 0x0f) === 15) {
      let extra: number;
      do {
        if (s >= src.length) throw new Error("truncated lz4");
        extra = src[s++];
        matchLen += extra;
      } while (extra === 255);
    }
    if (d + matchLen > dst.length) throw new Error("lz4 overflow");
    for (let i = 0; i < matchLen; i++) {
      dst[d] = dst[d - offset];
      d++;
    }
  }

  return dst.subarray(0, d);
}
