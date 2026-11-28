import fs from "node:fs";

/** SUP packets carry decoded-composition canvas dimensions in PCS (0x16). */
export function readPgsCanvas(file: string): { width: number; height: number } | undefined {
  const data = fs.readFileSync(file);
  for (let offset = 0; offset + 13 <= data.length;) {
    if (data[offset] !== 0x50 || data[offset + 1] !== 0x47) break;
    const type = data[offset + 10],
      size = data.readUInt16BE(offset + 11);
    if (offset + 13 + size > data.length) break;
    if (type === 0x16 && size >= 4) {
      const width = data.readUInt16BE(offset + 13),
        height = data.readUInt16BE(offset + 15);
      if (width > 0 && height > 0 && width <= 8192 && height <= 8192) return { width, height };
    }
    offset += size + 13;
  }
  return undefined;
}
