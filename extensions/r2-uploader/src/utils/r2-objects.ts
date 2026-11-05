import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createR2Client } from "./r2-client";

const BATCH_DELETE_CHUNK_SIZE = 1000;

export type FolderEntry = { type: "folder"; prefix: string; name: string };
export type FileEntry = {
  type: "file";
  key: string;
  name: string;
  size: number;
};
export type R2Entry = FolderEntry | FileEntry;

export function listR2Entries(prefix: string, { bucketName }: { bucketName: string; endpoint: string }) {
  return async ({ cursor }: { cursor?: string }): Promise<{ data: R2Entry[]; hasMore: boolean; cursor?: string }> => {
    const { client } = createR2Client();
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: cursor,
        MaxKeys: 100,
      }),
    );

    const data: R2Entry[] = [];
    for (const { Prefix: folderPrefix } of response.CommonPrefixes ?? []) {
      if (folderPrefix) {
        data.push({ type: "folder", prefix: folderPrefix, name: folderPrefix.slice(prefix.length, -1) });
      }
    }
    for (const { Key: key, Size: size } of response.Contents ?? []) {
      if (key && key !== prefix) {
        data.push({ type: "file", key, name: key.slice(prefix.length), size: size ?? 0 });
      }
    }
    const nextCursor = response.IsTruncated ? response.NextContinuationToken : undefined;
    return { data, hasMore: Boolean(nextCursor), cursor: nextCursor };
  };
}

export async function deleteR2Object(key: string): Promise<void> {
  const { client, bucketName } = createR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

// Lists every object key under a prefix, recursing into subfolders (no Delimiter), across all pages.
export async function listAllKeysUnderPrefix(prefix: string): Promise<string[]> {
  const { client, bucketName } = createR2Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (object.Key) {
        keys.push(object.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  const { client, bucketName } = createR2Client();
  const failures: string[] = [];

  for (let i = 0; i < keys.length; i += BATCH_DELETE_CHUNK_SIZE) {
    const chunk = keys.slice(i, i + BATCH_DELETE_CHUNK_SIZE);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: chunk.map((key) => ({ Key: key })), Quiet: true },
      }),
    );

    for (const error of response.Errors ?? []) {
      failures.push(`${error.Key}: ${error.Message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} file(s) could not be deleted: ${failures.slice(0, 5).join("; ")}${failures.length > 5 ? "; …" : ""}`,
    );
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
