import { inflateRawSync } from "zlib";

// Reads one file out of a remote .zip with HTTP Range requests, so only that file is downloaded
// (the Windows ffmpeg archives also carry ffprobe/ffplay and are 3x the size of ffmpeg itself).

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

async function fetchRange(url: string, start: number, end: number): Promise<{ data: Buffer; total: number }> {
  const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (res.status !== 206) throw new Error(`Failed to download encoder: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-range")?.split("/")[1]);
  return { data: Buffer.from(await res.arrayBuffer()), total };
}

/** Downloads and decompresses the entry named `name` from the zip at `url`. */
export async function fetchZipEntry(url: string, name: string): Promise<Buffer> {
  // GitHub's CDN rejects suffix ranges ("bytes=-N"), so learn the size first.
  const { total } = await fetchRange(url, 0, 0);
  // End of central directory: 22 bytes plus a comment of up to 64 KB, at the very end of the file.
  const tailStart = Math.max(0, total - (22 + 0xffff));
  const { data: tail } = await fetchRange(url, tailStart, total - 1);
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || tail.readUInt32LE(eocd) !== EOCD_SIG) throw new Error("Encoder archive is not a zip file");
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff) throw new Error("Encoder archive uses an unsupported zip format");

  const cd =
    cdOffset >= tailStart
      ? tail.subarray(cdOffset - tailStart, cdOffset - tailStart + cdSize)
      : (await fetchRange(url, cdOffset, cdOffset + cdSize - 1)).data;

  for (let p = 0; p + 46 <= cd.length && cd.readUInt32LE(p) === CENTRAL_SIG;) {
    const method = cd.readUInt16LE(p + 10);
    const compressedSize = cd.readUInt32LE(p + 20);
    const nameLength = cd.readUInt16LE(p + 28);
    const extraLength = cd.readUInt16LE(p + 30);
    const commentLength = cd.readUInt16LE(p + 32);
    const localOffset = cd.readUInt32LE(p + 42);
    const entryName = cd.toString("utf8", p + 46, p + 46 + nameLength);
    p += 46 + nameLength + extraLength + commentLength;
    if (entryName !== name) continue;

    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error("Encoder archive uses an unsupported zip format");
    }
    // The local header's name/extra lengths can differ from the central directory's, so read it first.
    const header = (await fetchRange(url, localOffset, localOffset + 29)).data;
    if (header.readUInt32LE(0) !== LOCAL_SIG) throw new Error("Encoder archive is corrupt");
    const dataStart = localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
    const body = (await fetchRange(url, dataStart, dataStart + compressedSize - 1)).data;
    if (method === 0) return body;
    if (method === 8) return inflateRawSync(body);
    throw new Error(`Encoder archive uses unsupported compression (${method})`);
  }
  throw new Error(`Encoder archive does not contain ${name}`);
}
