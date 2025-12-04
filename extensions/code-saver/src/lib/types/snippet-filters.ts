export const FILTER_ALL = "all";

export type SNIPPETS_FILTER = typeof FILTER_ALL | `library_${string}` | `label_${string}`;
