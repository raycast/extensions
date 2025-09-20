import getObsidianFiles from "./get-obsidian-files";
import { File, isStringArray } from "../types";
import tagify from "./tagify";

export function getTags(value: unknown): string[] {
  if (value == null || typeof value !== "object") return [];

  const { tags } = value as Record<string, unknown>;
  if (tags == null) return [];

  if (typeof tags === "string") {
    return tagify(tags);
  }

  if (isStringArray(tags)) {
    return tags.flatMap((tag) => tagify(tag));
  }

  return [];
}

export default async function getObsidianTags(cachedFiles: File[]): Promise<Set<string>> {
  const results = await getObsidianFiles(cachedFiles).then((files) => files.map((file) => getTags(file.attributes)));
  return new Set(results.flatMap((p) => p));
}
