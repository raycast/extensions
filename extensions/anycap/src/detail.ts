import { environment } from "@raycast/api";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { callToolResult, ToolResult } from "./anycap";

export function parseDetail(text: string) {
  const lines = text.split("\n");
  const title = lines.shift() ?? "";
  const fields: Record<string, string> = {};
  while (lines.length) {
    const match = lines[0].match(/^(\w+): (.+)$/);
    if (!match) break;
    fields[match[1]] = match[2];
    lines.shift();
    if (match[1] === "summary") {
      while (lines.length && lines[0].trim()) fields.summary += "\n" + lines.shift();
      break;
    }
  }
  const body = lines.join("\n").trim();
  let tags: string[] = [];
  try {
    tags = JSON.parse(fields.tags ?? "[]").filter((tag: unknown) => typeof tag === "string");
  } catch {
    /* Older helpers have no tag metadata. */
  }
  return { title, fields, body, tags };
}

export async function cachePreview(id: string, result: ToolResult): Promise<string | undefined> {
  const part = result.content.find((part) => part.type === "image");
  if (!part || part.type !== "image" || part.mimeType !== "image/jpeg" || !/^[\da-f-]{36}$/i.test(id)) return;
  const bytes = Buffer.from(part.data, "base64");
  if (bytes.length > 384 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
  const directory = join(environment.supportPath, "previews");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${id}.jpg`);
  await writeFile(path, bytes);
  const files = await Promise.all(
    (await readdir(directory))
      .filter((name) => /^[\da-f-]{36}\.jpg$/i.test(name))
      .map(async (name) => ({ name, modified: (await stat(join(directory, name))).mtimeMs })),
  );
  files.sort((a, b) => b.modified - a.modified);
  await Promise.all(
    files
      .slice(40)
      .filter((file) => file.name !== `${id}.jpg`)
      .map((file) => unlink(join(directory, file.name)).catch(() => undefined)),
  );
  return pathToFileURL(path).toString();
}

export async function loadDetail(id: string) {
  const result = await callToolResult("get", { id, include_preview: true });
  const text = result.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  const detail = parseDetail(text);
  const preview = await cachePreview(id, result).catch(() => undefined);
  const content = [
    detail.title,
    detail.fields.summary,
    preview ? `![Capture preview](${preview}?raycast-width=650)` : undefined,
    detail.body,
  ].filter(Boolean);
  return { ...detail, markdown: content.join("\n\n") };
}
