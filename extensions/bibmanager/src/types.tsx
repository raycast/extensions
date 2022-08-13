export interface Item {
  title: string;
  uid: string;
  link: string;
  year: number;
  month: number;
  content: string;
  tags: [];
  authors_tag: [];
  authors_string: string;
  pdf: string;
}

export interface State {
  isLoading: boolean;
  items: [];
  error?: Error;
  searchText: string;
}

export interface Preferences {
  python: string;
}
