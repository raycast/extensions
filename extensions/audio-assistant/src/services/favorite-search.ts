import { createHash } from "node:crypto";
import type { SearchPage, SearchRequest } from "../domain/model";
import { itemKey } from "../domain/policy";

export const favoriteKinds = ["tracks", "artists", "albums"] as const;
export type FavoriteKind = (typeof favoriteKinds)[number];
interface SourceCursor {
  offset: string;
  previous?: string;
}
type Cursor = Partial<Record<FavoriteKind, SourceCursor>>;
function readCursor(value: string | undefined): Cursor {
  if (!value) return { tracks: { offset: "0" }, artists: { offset: "0" }, albums: { offset: "0" } };
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid Favorites cursor.");
  const result: Cursor = {};
  for (const kind of favoriteKinds) {
    const part: unknown = Reflect.get(parsed, kind);
    if (part === undefined) continue;
    if (!part || typeof part !== "object" || Array.isArray(part)) throw new Error("Invalid Favorites cursor.");
    const offset: unknown = Reflect.get(part, "offset");
    const previous: unknown = Reflect.get(part, "previous");
    if (
      typeof offset !== "string" ||
      !/^\d+$/.test(offset) ||
      !Number.isSafeInteger(Number(offset)) ||
      (previous !== undefined && (typeof previous !== "string" || !/^[a-f0-9]{64}$/.test(previous)))
    )
      throw new Error("Invalid Favorites cursor.");
    result[kind] = { offset, previous: previous as string | undefined };
  }
  return result;
}

/** Page every healthy source independently; failed sources resume only on an explicit fresh search. */
export async function searchFavorites(
  request: SearchRequest,
  read: (kind: FavoriteKind, request: SearchRequest, signal?: AbortSignal) => Promise<SearchPage>,
  signal?: AbortSignal,
): Promise<SearchPage> {
  signal?.throwIfAborted();
  if (!Number.isInteger(request.limit) || request.limit < 1) throw new Error("Invalid Favorites page size.");
  const cursor = readCursor(request.cursor);
  const results = await Promise.allSettled(
    favoriteKinds.map(async (kind) => {
      const source = cursor[kind];
      if (!source) return { items: [] } as SearchPage;
      const page = await read(kind, { ...request, cursor: source.offset, limit: Math.min(request.limit, 100) }, signal);
      const fingerprint = createHash("sha256").update(page.items.map(itemKey).join("\0")).digest("hex");
      if (page.items.length && fingerprint === source.previous) throw new Error("Favorites page did not advance.");
      return { ...page, fingerprint };
    }),
  );
  signal?.throwIfAborted();
  const attempted = results.filter((_, i) => cursor[favoriteKinds[i]!] !== undefined);
  if (attempted.length && attempted.every((r) => r.status === "rejected"))
    throw new Error(
      "Could not load Favorites. The server may be unavailable or may not support favorite filtering. Use Refresh to retry.",
    );
  const items: SearchPage["items"] = [];
  const next: Cursor = {};
  const warnings: string[] = [];
  results.forEach((result, i) => {
    const kind = favoriteKinds[i]!;
    if (result.status === "rejected") {
      warnings.push(
        `Favorite ${kind} could not load. Use Refresh to retry; the server must support favorite filtering.`,
      );
      return;
    }
    const page = result.value;
    items.push(...page.items);
    if (page.nextCursor !== undefined && "fingerprint" in page)
      next[kind] = { offset: page.nextCursor, previous: page.fingerprint };
  });
  return {
    items,
    nextCursor: Object.keys(next).length ? JSON.stringify(next) : undefined,
    warnings: warnings.length ? warnings : undefined,
  };
}
