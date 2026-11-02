import type { CardSearchInput } from "./api";
import { searchQualifier } from "./searchFilters";
import { newShuffleSeed } from "./shuffleSeed";

// A folder id as Convex writes it; anything else is a folder's name.
const FOLDER_ID = /^[0-9a-z]{31,37}$/;

export interface SearchToolInput {
  /** When true, list archived cards only; by default they are left out. */
  archived?: boolean;
  createdAfter?: number;
  createdBefore?: number;
  /** "done" lists links marked read, watched, bought or done; "todo" the rest. */
  done?: "done" | "todo";
  favorited?: boolean;
  /** A folder's name, or its id from list-folders. */
  folder?: string;
  limit?: number;
  /** Images by mood, such as "moody brutalist". */
  mood?: string;
  query?: string;
  /** A card id: only the cards closest to it in meaning. */
  similarTo?: string;
  sort?: "newest" | "oldest" | "shuffle";
  tag?: string;
  type?: CardSearchInput["type"];
}

/** The card search the Search Teak Cards tool runs for what the model sent. */
export const toToolSearch = (
  input: SearchToolInput,
  limit: number,
  seed: () => number = newShuffleSeed,
): CardSearchInput => {
  const folder = input.folder?.trim();
  const folderIsId = Boolean(folder && FOLDER_ID.test(folder));
  const query = [
    input.query?.trim(),
    input.done ? `is:${input.done}` : undefined,
    input.mood?.trim() ? searchQualifier("mood", input.mood.trim()) : undefined,
    folder && !folderIsId ? searchQualifier("folder", folder) : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    archived: input.archived ? "only" : undefined,
    createdAfter: input.createdAfter,
    createdBefore: input.createdBefore,
    favorited: input.favorited,
    folder: folderIsId ? folder : undefined,
    limit,
    query: query || undefined,
    shuffleSeed: input.sort === "shuffle" ? seed() : undefined,
    similarTo: input.similarTo?.trim() || undefined,
    sort: input.sort,
    tag: input.tag,
    type: input.type,
  };
};
