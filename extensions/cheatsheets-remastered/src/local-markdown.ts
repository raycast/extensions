import { constants } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { repositoryMetadata } from "./markdown";
import type { CustomCheatsheet } from "./models";

const MAX_FILE_BYTES = 1024 * 1024;
export type LocalMarkdown = Pick<CustomCheatsheet, "title" | "content" | "tags" | "description">;

export async function readLocalMarkdown(filePath: string, signal?: AbortSignal): Promise<LocalMarkdown> {
  signal?.throwIfAborted();
  if (!/\.md$/i.test(filePath)) throw new Error("Choose a Markdown file with a .md extension.");
  // Nonblocking open avoids hanging on a named pipe masquerading as a .md file.
  const file = await open(filePath, constants.O_RDONLY | constants.O_NONBLOCK).catch(() => {
    throw new Error("Cannot read this file. Check that it is available and you have permission, then select it again.");
  });
  try {
    signal?.throwIfAborted();
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Choose a readable regular file, not a directory or special file.");
    if (info.size > MAX_FILE_BYTES) throw new Error("Choose a Markdown file no larger than 1 MiB.");
    // Bound the actual read too: a selected file can grow after stat.
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      signal?.throwIfAborted();
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    signal?.throwIfAborted();
    if (length > MAX_FILE_BYTES) throw new Error("Choose a Markdown file no larger than 1 MiB.");
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, length));
    } catch {
      throw new Error("This file is not valid UTF-8. Save a UTF-8 Markdown copy and select it again.");
    }
    if (!content.trim()) throw new Error("This file is empty. Choose a Markdown file containing text.");
    for (const character of content) {
      const code = character.charCodeAt(0);
      if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127)
        throw new Error("This file contains binary or control data. Choose a UTF-8 Markdown text file.");
    }
    const metadata = repositoryMetadata(content);
    return {
      ...metadata,
      title: metadata.title || path.basename(filePath).slice(0, -3).trim() || "Imported Markdown",
      content,
    };
  } finally {
    await file.close();
  }
}
