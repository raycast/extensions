import { open, type FileHandle } from "node:fs/promises";
import { TextDecoder } from "node:util";

import { GlossaryError, createUnreadableError } from "./glossary-error";

const maximumGlossaryBytes = 5 * 1024 * 1024;
const readChunkBytes = 64 * 1024;

const readGlossaryBytes = async (path: string): Promise<Buffer> => {
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, "r");
    const fileStats = await handle.stat();
    if (!fileStats.isFile()) {
      throw createUnreadableError();
    }
    if (fileStats.size > maximumGlossaryBytes) {
      throw new GlossaryError("too-large", "The glossary file is larger than 5 MiB.");
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    while (totalBytes <= maximumGlossaryBytes) {
      const bytesRemaining = maximumGlossaryBytes + 1 - totalBytes;
      const chunk = Buffer.allocUnsafe(Math.min(readChunkBytes, bytesRemaining));
      const { bytesRead } = await handle.read(chunk, 0, chunk.byteLength, null);
      if (bytesRead === 0) {
        break;
      }
      chunks.push(chunk.subarray(0, bytesRead));
      totalBytes += bytesRead;
    }

    if (totalBytes > maximumGlossaryBytes) {
      throw new GlossaryError("too-large", "The glossary file is larger than 5 MiB.");
    }

    return Buffer.concat(chunks, totalBytes);
  } catch (error: unknown) {
    if (error instanceof GlossaryError) {
      throw error;
    }
    throw createUnreadableError();
  } finally {
    await handle?.close().catch(() => null);
  }
};

export const readGlossarySource = async (path: string): Promise<string> => {
  const bytes = await readGlossaryBytes(path);
  try {
    return new TextDecoder("utf8", { fatal: true }).decode(bytes);
  } catch {
    throw new GlossaryError("invalid-encoding", "The glossary file must use valid UTF-8.");
  }
};
