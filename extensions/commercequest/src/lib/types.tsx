export interface Breadcrumb {
  name: string;
  url: string;
}

export interface SearchResult {
  recordID: string;
  name: string;
  recordType: string;
  type: string;
  dateUpdated: string;
  dateInserted: string;
  url: string;
  breadcrumbsFormatted: string;
  breadcrumbs: Breadcrumb[];
  body: string;
  insertUser?: User;
}

export interface User {
  name: string;
  photoUrl: string;
  url: string;
  label: string;
  title: string;
}

export interface ItemType {
  id: string;
  name: string;
}

export interface ItemGroup {
  title: string;
  items: SearchResult[];
}
