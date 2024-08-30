export enum Sort {
  SeedsAsc = "SeedsAsc",
  SeedsDesc = "SeedsDesc",
  SizeAsc = "SizeAsc",
  SizeDesc = "SizeDesc",
}

export interface SearchFormValues {
  search: string;
  sort: Sort;
}
