import fs from "node:fs";

type WavParts = { fmt: Buffer; data: Buffer; bytesPerSecond: number };

/** Walk the RIFF chunk list instead of assuming a 44-byte header — Azure adds a LIST chunk. */
const parseWav = (buffer: Buffer): WavParts => {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Not a RIFF/WAVE file");
  }
  let fmt: Buffer | undefined;
  let data: Buffer | undefined;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = buffer.subarray(
      offset + 8,
      Math.min(offset + 8 + size, buffer.length),
    );
    if (id === "fmt ") fmt = body;
    if (id === "data") data = body;
    offset += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAVE file without fmt/data chunk");
  return { fmt, data, bytesPerSecond: fmt.readUInt32LE(8) };
};

export const wavDurationMs = (file: string) => {
  const { data, bytesPerSecond } = parseWav(fs.readFileSync(file));
  return bytesPerSecond > 0
    ? Math.round((data.length / bytesPerSecond) * 1000)
    : 0;
};

/**
 * Glue several wav files of the same format into one, returning the start offset of each
 * part in milliseconds so word timings can be shifted onto the joined timeline.
 */
export const concatWav = (inputs: string[], output: string): number[] => {
  const parts = inputs.map((file) => parseWav(fs.readFileSync(file)));
  const first = parts[0];
  const offsets: number[] = [];
  let elapsedMs = 0;
  for (const part of parts) {
    offsets.push(elapsedMs);
    elapsedMs += Math.round((part.data.length / part.bytesPerSecond) * 1000);
  }

  const payload = Buffer.concat(parts.map((p) => p.data));
  const header = Buffer.alloc(12 + 8 + first.fmt.length + 8);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(header.length - 8 + payload.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(first.fmt.length, 16);
  first.fmt.copy(header, 20);
  header.write("data", 20 + first.fmt.length, "ascii");
  header.writeUInt32LE(payload.length, 24 + first.fmt.length);

  fs.writeFileSync(output, Buffer.concat([header, payload]));
  return offsets;
};
