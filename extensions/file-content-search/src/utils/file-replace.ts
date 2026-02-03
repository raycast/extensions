import { createReadStream, createWriteStream } from "node:fs";
import { open, rename, stat, unlink } from "node:fs/promises";
import { createInterface } from "node:readline";

const SMALL_FILE_THRESHOLD = 512 * 1024; // 512KB

/**
 * Replaces content in a specific line of a file.
 * Automatically selects the optimal strategy based on file size:
 * - Files under 512KB use fast in-memory approach (replaceInLineSmall)
 * - Larger files use streaming approach (replaceInLineStreaming) to avoid memory issues
 */
export const replaceInLine = async (
  filePath: string,
  lineNumber: number,
  search: string,
  replacement: string,
): Promise<void> => {
  const fileStats = await stat(filePath);

  // For small files, use simple in-memory approach
  if (fileStats.size < SMALL_FILE_THRESHOLD) {
    await replaceInLineSmall(filePath, lineNumber, search, replacement);
    return;
  }

  // For large files, use streaming with temp file
  await replaceInLineStreaming(filePath, lineNumber, search, replacement);
};

/**
 * In-memory replacement for small files (under 512KB).
 * Reads entire file into memory, performs replacement, and writes back.
 * Fast and simple, but not suitable for large files due to memory constraints.
 */
const replaceInLineSmall = async (
  filePath: string,
  lineNumber: number,
  search: string,
  replacement: string,
): Promise<void> => {
  await using handle = await open(filePath, "r+");

  const buffer = new Uint8Array(SMALL_FILE_THRESHOLD);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);

  const decoder = new TextDecoder("utf-8");
  const content = decoder.decode(buffer.subarray(0, bytesRead));
  const lines = content.split("\n");

  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error("Invalid line number");
  }

  lines[lineNumber - 1] = lines[lineNumber - 1].replace(search, replacement);
  const newContent = lines.join("\n");

  await handle.truncate(0);
  await handle.write(newContent, 0, "utf-8");
};

/**
 * Streaming replacement for large files.
 * Processes file line-by-line using Node.js readline interface, writing to a temp file.
 * Memory-efficient as it never loads the entire file into memory.
 * Atomically replaces original file on success; cleans up temp file on failure.
 */
const replaceInLineStreaming = async (
  filePath: string,
  lineNumber: number,
  search: string,
  replacement: string,
): Promise<void> => {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  return new Promise((resolve, reject) => {
    const readStream = createReadStream(filePath, { encoding: "utf-8" });
    const writeStream = createWriteStream(tempPath, { encoding: "utf-8" });
    const lineReader = createInterface({ input: readStream, crlfDelay: Infinity });

    let currentLine = 0;
    let replaced = false;

    writeStream.on("finish", async () => {
      if (!replaced) {
        await unlink(tempPath).catch(() => {});
        reject(new Error("Invalid line number"));
        return;
      }
      try {
        await rename(tempPath, filePath);
        resolve();
      } catch (err) {
        await unlink(tempPath).catch(() => {});
        reject(err);
      }
    });

    writeStream.on("error", async (err) => {
      lineReader.close();
      await unlink(tempPath).catch(() => {});
      reject(err);
    });

    lineReader.on("line", (line) => {
      currentLine++;
      if (currentLine === lineNumber) {
        writeStream.write(`${line.replace(search, replacement)}\n`);
        replaced = true;
      } else {
        writeStream.write(`${line}\n`);
      }
    });

    lineReader.on("close", () => {
      writeStream.end();
    });

    lineReader.on("error", async (err) => {
      writeStream.destroy();
      await unlink(tempPath).catch(() => {});
      reject(err);
    });
  });
};
