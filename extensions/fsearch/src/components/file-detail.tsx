import { List } from "@raycast/api";
import { closeSync, openSync, readSync } from "node:fs";
import { extname } from "node:path";
import { useMemo } from "react";
import type { Hit } from "../lib/fsearch";
import { encodePath, fileName, folderOf, formatDate, formatSize, modifiedDate } from "../lib/format";

const IMAGES = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".heic",
  ".heif",
  ".webp",
  ".tiff",
  ".tif",
  ".bmp",
  ".svg",
  ".avif",
  ".ico",
  ".icns",
]);
const PREVIEW_BYTES = 4096;

/** Name, place, size, and date, with a preview for images and text files. */
export function FileDetail({ hit }: { hit: Hit }) {
  const markdown = useMemo(() => preview(hit), [hit.path, hit.mtime]);
  const modified = modifiedDate(hit.mtime);
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={fileName(hit.path)} />
          <List.Item.Detail.Metadata.Label title="Where" text={folderOf(hit.path)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Kind" text={kindName(hit)} />
          {hit.kind === "file" && <List.Item.Detail.Metadata.Label title="Size" text={formatSize(hit.size)} />}
          {modified && <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(modified)} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function kindName(hit: Hit) {
  if (extname(hit.path).toLowerCase() === ".app") return "Application";
  switch (hit.kind) {
    case "dir":
      return "Folder";
    case "link":
      return "Alias";
    default:
      return extname(hit.path) ? `${extname(hit.path).slice(1).toUpperCase()} File` : "File";
  }
}

function preview(hit: Hit): string | undefined {
  if (hit.kind !== "file") return undefined;
  if (IMAGES.has(extname(hit.path).toLowerCase())) {
    return `![](file://${encodePath(hit.path)}?raycast-height=240)`;
  }
  const text = readHead(hit.path);
  if (text === undefined) return undefined;
  // Longer than any run of backticks in the file, so nothing in it can close the block and become Markdown.
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${text}\n${fence}`;
}

/** The first few KB as text, or nothing if it looks binary. */
function readHead(path: string): string | undefined {
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const buffer = Buffer.alloc(PREVIEW_BYTES);
    const length = readSync(fd, buffer, 0, PREVIEW_BYTES, 0);
    const bytes = buffer.subarray(0, length);
    if (length === 0 || bytes.includes(0)) return undefined;
    const text = bytes.toString("utf8");
    if (text.includes("�")) return undefined;
    return text.split("\n").slice(0, 60).join("\n");
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
