import { z } from "zod";

const ListCountsSchema = z
  .object({
    movies: z.number().optional(),
    shows: z.number().optional(),
    seasons: z.number().optional(),
    episodes: z.number().optional(),
  })
  .optional();

const ListNotFoundSchema = z
  .object({
    movies: z.array(z.unknown()).optional(),
    shows: z.array(z.unknown()).optional(),
    seasons: z.array(z.unknown()).optional(),
    episodes: z.array(z.unknown()).optional(),
  })
  .optional();

const ListItemsWriteSchema = z
  .object({
    added: ListCountsSchema,
    existing: ListCountsSchema,
    deleted: ListCountsSchema,
    not_found: ListNotFoundSchema,
    list: z.object({ item_count: z.number().optional() }).passthrough().optional(),
  })
  .passthrough();

export type ListItemKind = "movies" | "shows" | "seasons" | "episodes";

export const LIST_ITEM_KINDS: ListItemKind[] = ["movies", "shows", "seasons", "episodes"];

export type ListCounts = Record<ListItemKind, number>;

export type ListWriteResult = {
  added: ListCounts;
  existing: ListCounts;
  deleted: ListCounts;
  notFound: ListCounts;
  listItemCount?: number;
  /** False when the body did not look like Trakt's add/remove payload at all. */
  known: boolean;
};

function zeroCounts(): ListCounts {
  return { movies: 0, shows: 0, seasons: 0, episodes: 0 };
}

export function totalCount(counts: ListCounts): number {
  return LIST_ITEM_KINDS.reduce((sum, kind) => sum + counts[kind], 0);
}

/**
 * Read Trakt's list add/remove payload. The HTTP status alone is not a write: an item
 * already on the list comes back `existing`, and a wrong ID comes back `not_found`.
 */
export function readListWrite(body: unknown): ListWriteResult {
  const parsed = ListItemsWriteSchema.safeParse(body);
  if (!parsed.success || body === undefined || body === null) {
    return {
      added: zeroCounts(),
      existing: zeroCounts(),
      deleted: zeroCounts(),
      notFound: zeroCounts(),
      known: false,
    };
  }

  const data = parsed.data;
  const counts = (bucket: typeof data.added): ListCounts => {
    const result = zeroCounts();
    for (const kind of LIST_ITEM_KINDS) result[kind] = bucket?.[kind] ?? 0;
    return result;
  };
  const notFound = zeroCounts();
  for (const kind of LIST_ITEM_KINDS) notFound[kind] = data.not_found?.[kind]?.length ?? 0;

  return {
    added: counts(data.added),
    existing: counts(data.existing),
    deleted: counts(data.deleted),
    notFound,
    listItemCount: data.list?.item_count,
    known: true,
  };
}

/**
 * An add is only a write when Trakt stored or already held something. A 201 with every count
 * at 0 means the body was ignored, and a response Trakt did not shape at all proves nothing.
 */
export function assertListAdded(result: ListWriteResult, listName: string): void {
  if (!result.known) {
    throw new Error(`Trakt did not confirm the write to "${listName}". Check the list before retrying.`);
  }
  if (totalCount(result.added) === 0 && totalCount(result.existing) === 0) {
    throw new Error(
      totalCount(result.notFound) > 0
        ? `Trakt matched none of the items for "${listName}". Re-resolve the IDs before writing.`
        : `Trakt did not add anything to "${listName}". Re-resolve the items before writing.`,
    );
  }
}

export function assertListRemovalRead(result: ListWriteResult, listName: string): void {
  if (!result.known) {
    throw new Error(`Trakt did not confirm the removal from "${listName}". Check the list before retrying.`);
  }
}
