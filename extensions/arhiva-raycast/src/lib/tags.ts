import { dedupeTags } from "./utils";

export function parseTags(value: string | undefined) {
  if (value == null || value.trim().length === 0) {
    return undefined;
  }

  const tags = dedupeTags(
    value
      .split(/[,\n#]/g)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
  );

  return tags.length > 0 ? tags : undefined;
}

export function formatTags(tags: ReadonlyArray<string>) {
  return tags.join(", ");
}
