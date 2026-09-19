import { mkdir, open, stat, unlink } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  ClientError,
  Entry,
  GrokClient,
  record,
  requiredString,
} from "./client";

export function attachmentOf(
  entry: Entry,
): { path: string; name: string } | undefined {
  if (
    entry.kind === "user-attachment" &&
    typeof entry.file_path === "string" &&
    entry.file_path.startsWith("/") &&
    typeof entry.file_name === "string"
  )
    return { path: entry.file_path, name: entry.file_name };
  const message = entry.message;
  if (
    !record(message) ||
    message.type !== "attachment" ||
    typeof message.url !== "string" ||
    !message.url.startsWith("/")
  )
    return;
  return {
    path: message.url,
    name:
      typeof message.file_name === "string"
        ? message.file_name
        : basename(message.url),
  };
}

/** Download through the authenticated host, never sending tokens to attachment URLs. */
export async function downloadFile(
  client: Pick<GrokClient, "command">,
  agentId: string,
  hostPath: string,
  name: string,
  directory: string,
): Promise<string> {
  if (!hostPath.startsWith("/") || hostPath.includes("\0"))
    throw new ClientError("This file requires opening in the Grok Bot app.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = join(
    directory,
    `${randomUUID()}-${basename(name).replace(/[^a-zA-Z0-9._ -]/g, "_") || "download"}`,
  );
  const handle = await open(destination, "wx", 0o600);
  let complete = false;
  try {
    let offset = 0;
    let expected: number | undefined;
    do {
      const result = await client.command("readAttachmentChunk", {
        agentId,
        path: hostPath,
        offset,
        length: 1024 * 1024,
      });
      if (
        !record(result) ||
        typeof result.bytesBase64 !== "string" ||
        !Number.isSafeInteger(result.totalSize) ||
        Number(result.totalSize) < 0 ||
        Number(result.totalSize) > 200 * 1024 * 1024
      )
        throw new ClientError(
          "Invalid file download response or file exceeds 200 MB.",
        );
      const total = Number(result.totalSize);
      if (expected !== undefined && expected !== total)
        throw new ClientError("The file changed during download.");
      expected = total;
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          result.bytesBase64,
        )
      )
        throw new ClientError("Invalid file encoding.");
      const bytes = Buffer.from(result.bytesBase64, "base64");
      if (
        bytes.length > 1024 * 1024 ||
        offset + bytes.length > total ||
        (!bytes.length && offset < total)
      )
        throw new ClientError("File download was incomplete.");
      await handle.writeFile(bytes);
      offset += bytes.length;
    } while (offset < expected);
    complete = true;
    return destination;
  } finally {
    await handle.close();
    if (!complete) await unlink(destination);
  }
}

/** Validate every selected file before uploading any of them. */
export async function uploadFiles(
  client: Pick<GrokClient, "command">,
  agentId: string,
  paths: string[],
): Promise<{ path: string; name: string }[]> {
  if (paths.length > 6) throw new ClientError("Attach at most six files.");
  const files = await Promise.all(
    paths.map(async (path) => {
      const info = await stat(path);
      const maximum = [".mp4", ".mov", ".webm", ".mkv"].includes(
        extname(path).toLowerCase(),
      )
        ? 200 * 1024 * 1024
        : 25 * 1024 * 1024;
      if (!info.isFile() || info.size > maximum)
        throw new ClientError(
          `${basename(path)} must be a regular file no larger than ${maximum / 1024 / 1024} MB.`,
        );
      return { path, name: basename(path), size: info.size };
    }),
  );
  const uploaded: { path: string; name: string }[] = [];
  for (const file of files) {
    const handle = await open(file.path, "r");
    try {
      const current = await handle.stat();
      if (!current.isFile() || current.size !== file.size)
        throw new ClientError(
          `${file.name} changed before upload. Select it again.`,
        );
      if (file.size <= 1024 * 1024) {
        const bytes = await handle.readFile();
        const response = await client.command(
          "uploadAttachment",
          {
            agentId,
            filename: file.name,
            bytesBase64: bytes.toString("base64"),
          },
          { mutation: true },
        );
        if (!record(response))
          throw new ClientError("Invalid attachment upload response.");
        uploaded.push({
          path: requiredString(response.path, "attachment path"),
          name: file.name,
        });
      } else {
        const uploadId = randomUUID();
        let committedPath: string | undefined;
        for (let offset = 0; offset < file.size;) {
          const buffer = Buffer.alloc(
            Math.min(1024 * 1024, file.size - offset),
          );
          const { bytesRead } = await handle.read(
            buffer,
            0,
            buffer.length,
            offset,
          );
          if (!bytesRead)
            throw new ClientError(`${file.name} changed during upload.`);
          const response = await client.command(
            "uploadAttachmentChunk",
            {
              agentId,
              uploadId,
              filename: file.name,
              offset,
              totalSize: file.size,
              bytesBase64: buffer.subarray(0, bytesRead).toString("base64"),
            },
            { mutation: true },
          );
          if (!record(response))
            throw new ClientError("Invalid attachment chunk response.");
          if (typeof response.committedPath === "string")
            committedPath = response.committedPath;
          offset += bytesRead;
        }
        uploaded.push({
          path: requiredString(committedPath, "committed attachment path"),
          name: file.name,
        });
      }
    } finally {
      await handle.close();
    }
  }
  return uploaded;
}
