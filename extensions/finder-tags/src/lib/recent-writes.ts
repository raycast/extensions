import { Cache } from "@raycast/api";
import { z } from "zod";
import { fileSchema, TaggedFile } from "./models";
import { isWithin } from "./query";

const cache = new Cache({ namespace: "recent-tag-writes" });
const schema = z.array(z.object({ file: fileSchema, expiresAt: z.number() }));

function entries() {
  try {
    return schema.parse(JSON.parse(cache.get("files") ?? "[]")).filter((entry) => entry.expiresAt > Date.now());
  } catch {
    return [];
  }
}

export function rememberWrites(files: TaggedFile[]) {
  const updated = new Map(entries().map((entry) => [entry.file.path, entry]));
  files.forEach((file) => updated.set(file.path, { file, expiresAt: Date.now() + 120_000 }));
  cache.set("files", JSON.stringify([...updated.values()]));
}

export function recentPaths(scopes: string[]): string[] {
  return entries()
    .map((entry) => entry.file.path)
    .filter((path) => scopes.some((scope) => isWithin(path, scope)));
}
