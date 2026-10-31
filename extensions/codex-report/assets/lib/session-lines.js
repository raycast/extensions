import fs from "node:fs";
import { compose } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { createZstdDecompress } from "node:zlib";
import { zstdFrames } from "./zstd-frames.js";

async function* decompressedChunks(filePath) {
  const file = await fs.promises.open(filePath, "r");
  try {
    for await (const range of zstdFrames(file)) {
      const stream = compose(fs.createReadStream(filePath, range), createZstdDecompress());
      try {
        yield* stream;
      } finally {
        stream.destroy();
      }
    }
  } finally {
    await file.close();
  }
}

// Stream both storage formats through the same UTF-8 and JSONL handling.
export async function* sessionLines(filePath) {
  const chunks = filePath.endsWith(".zst") ? decompressedChunks(filePath) : fs.createReadStream(filePath);
  const decoder = new StringDecoder("utf8");
  let pending = "";
  try {
    for await (const chunk of chunks) {
      const text = decoder.write(chunk);
      let start = 0;
      let end;
      // Search only new data so large tool-output lines are not rescanned.
      while ((end = text.indexOf("\n", start)) !== -1) {
        yield (pending + text.slice(start, end)).replace(/\r$/, "");
        pending = "";
        start = end + 1;
      }
      pending += text.slice(start);
    }
    pending += decoder.end();
    if (pending) yield pending.replace(/\r$/, "");
  } catch (error) {
    throw new Error(`Unable to read session ${filePath}: ${error.message}`, { cause: error });
  } finally {
    chunks.destroy?.();
  }
}
