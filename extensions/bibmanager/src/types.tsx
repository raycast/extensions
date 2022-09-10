export interface Item {
  title: string;
  uid: string;
  link: string;
  year: number;
  adscode: string;
  month: number;
  content: string;
  tags: [];
  authors_tag: [];
  keywords: [];
  authors_string: string;
  pdf: string;
}

export interface State {
  isLoading: boolean;
  items: Item[];
  error?: Error;
  searchText: string;
}

export interface Preferences {
  python: string;
}
