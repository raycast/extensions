export enum SortDirection {
  Ascending = "asc",
  Descending = "desc",
}

export enum SortProperty {
  CreatedDate = "created_date",
  LastModifiedDate = "last_modified_date",
  LastOpenedDate = "last_opened_date",
  Name = "name",
}

export interface SearchRequest {
  query: string;
  types: string[];
  sort?: SortOptions;
}

export interface SortOptions {
  property_key: SortProperty;
  direction: SortDirection;
}
