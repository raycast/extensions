import { z } from "zod";

export const tagSchema = z.object({ name: z.string(), color: z.number().int().min(0).max(7) });
export const fileSchema = z.object({
  path: z.string(),
  name: z.string(),
  tags: z.array(tagSchema),
  kind: z.string(),
  contentTypes: z.array(z.string()),
  size: z.number().nonnegative(),
  modifiedAt: z.string().nullable().optional(),
  changed: z.boolean(),
});
export const batchSchema = z.object({
  files: z.array(fileSchema),
  failures: z.array(z.object({ path: z.string(), message: z.string() })),
});
export const catalogSchema = z.object({ tags: z.array(tagSchema), warnings: z.array(z.string()) });

export type FinderTag = z.infer<typeof tagSchema>;
export type TaggedFile = z.infer<typeof fileSchema>;
export type FileBatch = z.infer<typeof batchSchema>;
export type TagCount = FinderTag & { count: number };
export type Match = "all" | "any";
export type Mutation =
  { kind: "add" | "remove" | "set"; tags: string[] } | { kind: "rename"; oldName: string; newName: string };

export function tagCountLabel(count: number, partial: boolean): string {
  if (partial && count === 0) return "Count unavailable";
  return `${count}${partial ? "+" : ""} ${count === 1 && !partial ? "file" : "files"}`;
}

export function tagKey(name: string) {
  return name.normalize("NFC").toLowerCase();
}

export function normalizeTags(tags: string[]): string[] {
  const result = new Map<string, string>();
  for (const input of tags) {
    const name = input.trim().normalize("NFC");
    if (!name || /\p{Cc}/u.test(name) || Buffer.byteLength(name, "utf8") > 255) {
      throw new Error("Tag names must contain 1–255 UTF-8 bytes and no control characters.");
    }
    if (!result.has(tagKey(name))) result.set(tagKey(name), name);
  }
  return [...result.values()];
}

export function canonicalTags(tags: string[], known: FinderTag[]): string[] {
  return normalizeTags(tags).map((name) => known.find((tag) => tagKey(tag.name) === tagKey(name))?.name ?? name);
}

export function parseQuickTag(argument: string): { kind: "add" | "remove"; tags: string[] } {
  const value = argument.trim();
  const kind = value.startsWith("-") ? "remove" : "add";
  const parts = (kind === "remove" ? value.slice(1) : value).split(",");
  if (parts.some((part) => part.trim().startsWith("-"))) {
    throw new Error("Use one leading minus to remove all listed tags, for example: -draft,review.");
  }
  return { kind, tags: normalizeTags(parts) };
}

export function matchesTags(file: TaggedFile, tags: string[], match: Match): boolean {
  if (!tags.length) return file.tags.length > 0;
  const keys = new Set(file.tags.map((tag) => tagKey(tag.name)));
  return match === "all" ? tags.every((tag) => keys.has(tagKey(tag))) : tags.some((tag) => keys.has(tagKey(tag)));
}

export function aggregateTags(files: TaggedFile[], palette: FinderTag[]): TagCount[] {
  const result = new Map<string, TagCount>(palette.map((tag) => [tagKey(tag.name), { ...tag, count: 0 }]));
  for (const file of files) {
    const seen = new Set<string>();
    for (const tag of file.tags) {
      const key = tagKey(tag.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const item = result.get(key);
      if (item) item.count += 1;
      else result.set(key, { ...tag, count: 1 });
    }
  }
  return [...result.values()];
}

export function replaceFiles(files: TaggedFile[], updates: TaggedFile[]): TaggedFile[] {
  const result = new Map(files.map((file) => [file.path, file]));
  updates.forEach((file) => result.set(file.path, file));
  return [...result.values()];
}
