import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { crc32, inflateRawSync } from "node:zlib";

interface ExtractedEntry {
  name: string;
  data?: Buffer;
}

function endOfCentralDirectory(zip: Buffer): number {
  const minimum = Math.max(0, zip.length - 65_557);
  for (let offset = zip.length - 22; offset >= minimum; offset--) {
    if (zip.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid ZIP: end of central directory not found");
}

function safeName(rawName: string): string {
  const name = rawName.replaceAll("\\", "/");
  if (
    !name ||
    name.includes("\0") ||
    name.startsWith("/") ||
    /^[A-Za-z]:/.test(name) ||
    name.split("/").some((part) => part === "..")
  ) {
    throw new Error(`Unsafe ZIP path: ${rawName}`);
  }
  return name;
}

function parseEntries(zip: Buffer): ExtractedEntry[] {
  const end = endOfCentralDirectory(zip);
  const entryCount = zip.readUInt16LE(end + 10);
  const centralSize = zip.readUInt32LE(end + 12);
  let offset = zip.readUInt32LE(end + 16);
  const centralEnd = offset + centralSize;
  if (centralEnd > end) throw new Error("Invalid ZIP: central directory is out of bounds");

  const entries: ExtractedEntry[] = [];
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > centralEnd || zip.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP: malformed central directory");
    }
    const flags = zip.readUInt16LE(offset + 8);
    const method = zip.readUInt16LE(offset + 10);
    const expectedCrc = zip.readUInt32LE(offset + 16);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > centralEnd) throw new Error("Invalid ZIP: malformed central directory entry");
    if ((flags & 1) !== 0) throw new Error("Encrypted ZIP entries are not supported");
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP compression method: ${method}`);

    const name = safeName(zip.toString("utf8", offset + 46, offset + 46 + nameLength));
    if (localOffset + 30 > zip.length || zip.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("Invalid ZIP: local entry not found");
    }
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + compressedSize;
    if (dataEnd > zip.length) throw new Error("Invalid ZIP: entry data is out of bounds");

    if (name.endsWith("/")) {
      entries.push({ name });
    } else {
      const compressed = zip.subarray(dataOffset, dataEnd);
      const data = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);
      if (data.length !== uncompressedSize || crc32(data) !== expectedCrc) {
        throw new Error(`Invalid ZIP entry: ${name}`);
      }
      entries.push({ name, data });
    }
    offset = nextOffset;
  }
  return entries;
}

export async function extractZip(zip: Buffer, destDir: string): Promise<void> {
  const entries = parseEntries(zip);
  await mkdir(destDir, { recursive: true });
  for (const entry of entries) {
    const destination = path.join(destDir, ...entry.name.split("/"));
    if (entry.data === undefined) {
      await mkdir(destination, { recursive: true });
    } else {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, entry.data);
    }
  }
}
