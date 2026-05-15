export type CommonOptionType = {
  id: string;
  name: string;
  value: string;
};

export const SortOrder = {
  Ascending: "asc",
  Descending: "desc",
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
