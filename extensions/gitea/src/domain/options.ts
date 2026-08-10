export type Option<TValue extends string = string> = {
  id: string;
  name: string;
  value: TValue;
};

export const SortOrder = {
  Ascending: "asc",
  Descending: "desc",
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
