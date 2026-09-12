export const FILTER_ALL = "all";
export const FILTER_PERSONAL_ALL = "personal_all";

export type SNIPPETS_FILTER = typeof FILTER_ALL | typeof FILTER_PERSONAL_ALL | `team_all_${string}` | `label_${string}`;
