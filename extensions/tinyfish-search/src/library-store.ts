import { createHash } from "node:crypto";
import { z } from "zod";
import { fetchOptionsSchema, fetchResultSchema, searchFiltersSchema, type FetchOptions } from "./tinyfish.ts";

export const searchRecipeSchema = z.object({
  query: z.string().trim().min(1),
  filters: searchFiltersSchema,
  location: z.string().optional(),
  language: z.string().optional(),
});
export type SearchRecipe = z.infer<typeof searchRecipeSchema>;
const savedSearchSchema = z.object({
  id: z.string(),
  title: z.string(),
  recipe: searchRecipeSchema,
  createdAt: z.number(),
});
const historySchema = z.object({ id: z.string(), recipe: searchRecipeSchema, lastUsedAt: z.number() });
const readingSchema = z.object({ id: z.string(), url: z.string(), title: z.string(), savedAt: z.number() });
const snapshotSchema = z.object({
  page: fetchResultSchema,
  fetchedAt: z.number(),
  options: fetchOptionsSchema.optional(),
});
export const presetSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  include: z.array(z.string().trim().min(1).max(1000)).max(20),
  exclude: z.array(z.string().trim().min(1).max(1000)).max(20),
});
export type ExtractionPreset = z.infer<typeof presetSchema>;
export type SavedSearch = z.infer<typeof savedSearchSchema> & { pinned: boolean };
export type SearchHistory = z.infer<typeof historySchema>;
export type ReadingItem = z.infer<typeof readingSchema> & { read: boolean; snapshot?: z.infer<typeof snapshotSchema> };

export function getReadingRefreshOptions(item: ReadingItem): FetchOptions {
  return {
    format: item.snapshot?.page.format,
    links: true,
    image_links: Boolean(item.snapshot?.page.image_links),
    ...item.snapshot?.options,
    urls: [item.url],
    ttl: 0,
  };
}

export interface LibraryStorage {
  all(): Promise<Record<string, unknown>>;
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function recordId(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseStored<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const result = schema.safeParse(JSON.parse(value));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

function searchIdentity(recipe: SearchRecipe) {
  // Parsing establishes stable property order and removes unknown fields.
  return recordId(JSON.stringify(searchRecipeSchema.parse(recipe)));
}

export function createLibraryStore(storage: LibraryStorage) {
  async function entries<T>(prefix: string, schema: z.ZodType<T>) {
    const all = await storage.all();
    return Object.entries(all).flatMap(([key, value]) => {
      const entry = key.startsWith(prefix) ? parseStored(schema, value) : undefined;
      return entry ? [entry] : [];
    });
  }
  return {
    async recordSearch(recipe: SearchRecipe) {
      const parsed = searchRecipeSchema.parse(recipe);
      const id = searchIdentity(parsed);
      await storage.set(`history:${id}`, JSON.stringify({ id, recipe: parsed, lastUsedAt: Date.now() }));
      const history = await entries("history:", historySchema);
      const stale = history.sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(100);
      await Promise.all(stale.map((entry) => storage.remove(`history:${entry.id}`)));
    },
    async listHistory() {
      return (await entries("history:", historySchema)).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    },
    async removeHistory(id: string) {
      await storage.remove(`history:${id}`);
    },
    async clearHistory() {
      const history = await entries("history:", historySchema);
      await Promise.all(history.map((entry) => storage.remove(`history:${entry.id}`)));
    },
    async saveSearch(recipe: SearchRecipe, title: string) {
      const parsed = searchRecipeSchema.parse(recipe);
      const id = searchIdentity(parsed);
      const old = parseStored(savedSearchSchema, await storage.get(`search:${id}`));
      await storage.set(
        `search:${id}`,
        JSON.stringify({
          id,
          recipe: parsed,
          title: title.trim() || parsed.query,
          createdAt: old?.createdAt ?? Date.now(),
        }),
      );
      return id;
    },
    async listSearches(): Promise<SavedSearch[]> {
      const all = await storage.all();
      const searches = Object.entries(all).flatMap(([key, value]) => {
        const entry = key.startsWith("search:") ? parseStored(savedSearchSchema, value) : undefined;
        return entry ? [{ ...entry, pinned: all[`pinned:${entry.id}`] === "true" }] : [];
      });
      return searches.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
    },
    async pinSearch(id: string, pinned: boolean) {
      await storage.set(`pinned:${id}`, String(pinned));
    },
    async removeSearch(id: string) {
      await storage.remove(`search:${id}`);
      await storage.remove(`pinned:${id}`);
    },
    async saveReading(input: {
      url: string;
      title: string;
      page?: z.infer<typeof fetchResultSchema>;
      options?: FetchOptions;
    }) {
      const id = recordId(input.url);
      const old = parseStored(readingSchema, await storage.get(`reading:${id}`));
      await storage.set(
        `reading:${id}`,
        JSON.stringify({ id, url: input.url, title: input.title || input.url, savedAt: old?.savedAt ?? Date.now() }),
      );
      if (input.page) {
        await storage.set(
          `content:${id}`,
          JSON.stringify({
            page: fetchResultSchema.parse(input.page),
            fetchedAt: Date.now(),
            options: input.options
              ? fetchOptionsSchema.parse({
                  ...input.options,
                  urls: [input.url],
                  format: input.page.format ?? input.options.format,
                })
              : undefined,
          }),
        );
      }
      return id;
    },
    async listReading(): Promise<ReadingItem[]> {
      const all = await storage.all();
      return Object.entries(all)
        .flatMap(([key, value]) => {
          const entry = key.startsWith("reading:") ? parseStored(readingSchema, value) : undefined;
          return entry
            ? [
                {
                  ...entry,
                  read: all[`read:${entry.id}`] === "true",
                  snapshot: parseStored(snapshotSchema, all[`content:${entry.id}`]),
                },
              ]
            : [];
        })
        .sort((a, b) => b.savedAt - a.savedAt);
    },
    async markRead(id: string, read: boolean) {
      await storage.set(`read:${id}`, String(read));
    },
    async removeReading(id: string) {
      await storage.remove(`reading:${id}`);
      await storage.remove(`content:${id}`);
      await storage.remove(`read:${id}`);
    },
    async savePreset(preset: ExtractionPreset) {
      await storage.set(`preset:${preset.id}`, JSON.stringify(presetSchema.parse(preset)));
    },
    async listPresets() {
      return entries("preset:", presetSchema);
    },
    async removePreset(id: string) {
      await storage.remove(`preset:${id}`);
    },
  };
}
