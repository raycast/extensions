import getObsidianFiles from "./get-obsidian-files";
import { isStringArray } from "../types";
import slugify from "./slugify";

function getTags(value: unknown): string[] {
  if (value == null || typeof value !== "object") return [];

  const { tags } = value as Record<string, unknown>;
  if (tags == null) return [];

  if (typeof tags === "string") {
    return tags
      .split(/\s+/)
      .filter((tag) => tag.startsWith("#"))
      .map((tag) => tag.slice(1))
      .map((tag) => slugify(tag));
  }

  if (isStringArray(tags)) {
    return tags;
  }

  return [];
}

export default async function getObsidianTags(): Promise<Set<string>> {
  const results = await getObsidianFiles().then((files) => files.map((file) => getTags(file.attributes)));
  return new Set(results.flatMap((p) => p));
}
