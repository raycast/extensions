export enum Sort {
  SeedsAsc = "SeedsAsc",
  SeedsDesc = "SeedsDesc",
  SizeAsc = "SizeAsc",
  SizeDesc = "SizeDesc",
}

export interface SearchFormValues {
  search: string;
  indexerIds: string[];
  allIndexers: boolean;
  categoryIds: string[];
  sort: Sort;
}

export type NonNullableFields<T> = Required<{
  [P in keyof T]: NonNullable<T[P]>;
}>;
