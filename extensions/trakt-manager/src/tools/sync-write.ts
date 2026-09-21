import { z } from "zod";

const SyncCountsSchema = z
  .object({
    movies: z.number().optional(),
    shows: z.number().optional(),
    seasons: z.number().optional(),
    episodes: z.number().optional(),
  })
  .optional();

const SyncNotFoundSchema = z
  .object({
    movies: z.array(z.unknown()).optional(),
    shows: z.array(z.unknown()).optional(),
    seasons: z.array(z.unknown()).optional(),
    episodes: z.array(z.unknown()).optional(),
  })
  .optional();

const TraktSyncWriteSchema = z
  .object({
    added: SyncCountsSchema,
    existing: SyncCountsSchema,
    deleted: SyncCountsSchema,
    not_found: SyncNotFoundSchema,
  })
  .passthrough();

export type SyncKind = "movies" | "shows" | "seasons" | "episodes";

export type SyncWriteResult = {
  added: number;
  existing: number;
  deleted: number;
  notFound: number;
  known: boolean;
};

export function syncKindForMedia(type: "movie" | "show" | "season" | "episode"): SyncKind {
  if (type === "movie") return "movies";
  if (type === "show") return "shows";
  if (type === "season") return "seasons";
  return "episodes";
}

/**
 * Read Trakt's add/remove payload. HTTP 201 alone is not a write: an ID already on the
 * watchlist comes back `existing`, and a bad ID comes back `not_found` with nothing added.
 */
export function readSyncWrite(body: unknown, kinds: SyncKind | SyncKind[]): SyncWriteResult {
  const wanted = Array.isArray(kinds) ? kinds : [kinds];
  const parsed = TraktSyncWriteSchema.safeParse(body);
  if (!parsed.success) {
    return { added: 0, existing: 0, deleted: 0, notFound: 0, known: false };
  }

  const data = parsed.data;
  const count = (bucket: typeof data.added) => wanted.reduce((sum, kind) => sum + (bucket?.[kind] ?? 0), 0);
  const notFound = wanted.reduce((sum, kind) => sum + (data.not_found?.[kind]?.length ?? 0), 0);

  return {
    added: count(data.added),
    existing: count(data.existing),
    deleted: count(data.deleted),
    notFound,
    known: true,
  };
}

export function assertSyncFound(result: SyncWriteResult, label: string): void {
  if (result.known && result.notFound > 0 && result.added === 0 && result.existing === 0 && result.deleted === 0) {
    throw new Error(`${label} was not accepted by Trakt. Re-resolve the item before writing.`);
  }
}

/**
 * A 201 with every count at 0 is not a write. Trakt does that when the body is ignored
 * (empty `seasons` array, missing Content-Type) — HTTP success, nothing stored.
 */
export function assertSyncAdded(result: SyncWriteResult, label: string): void {
  assertSyncFound(result, label);
  if (result.known && result.added === 0 && result.existing === 0) {
    throw new Error(`Trakt did not add ${label}. Re-resolve the item before writing.`);
  }
}
