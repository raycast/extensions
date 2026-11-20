/**
 * View types for the UI reused from raycast/extensions' extensions/raindrop-io
 * (MIT, commit 4cd99da7dfe0dbe794f371f7ec59550d52558c2b). The shapes match that
 * extension so its components stay unchanged; values are produced from ME
 * entities by helpers/me.ts instead of the Raindrop REST API.
 */
export type Bookmark = {
  /** ME entity id; the upstream number id is replaced, so all uses are strings. */
  _id: string;
  life: string;
  title: string;
  link: string;
  tags: string[];
  note: string;
  excerpt: string;
  type: string;
  important: boolean;
  collection: { $id: string | null; title: string };
  /** Conflicted field names, resolved in the ME manager. */
  conflicts: string[];
  /** Count of structural problems (missing parent/tag) reported by the helper. */
  structural: number;
  candidateMatch: boolean;
};

export type Collection = {
  _id: string;
  title: string;
  cover?: string[];
  parent?: { $id?: string | null };
  children?: Collection[];
};

export type CollectionsResponse = {
  result: boolean;
  items: Collection[];
};

export type TagsResponse = {
  items: Array<{ _id: string; name: string }>;
};

export type CollectionItem = {
  value: string;
  label: string;
  name?: string;
  cover?: string;
};

export type BookmarksParams = {
  collection: string;
  search?: string;
};

export type FormValues = {
  link: string;
  title?: string;
  collection?: string;
  tags: string[];
  note?: string;
  description?: string;
  favorite?: boolean;
};

/** Field values as stored, used to decide what an inline edit actually changes. */
export type EditBaseline = {
  link: string;
  title: string;
  note: string;
  description: string;
  favorite: boolean;
  /** Collection entity id, or "-1" for Unsorted. */
  collection: string;
  /** Active tag entity ids. */
  tags: string[];
  order: number;
};
