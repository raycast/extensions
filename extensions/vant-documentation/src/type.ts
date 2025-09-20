export type RecordObject<T = string> = Record<string, T>;

export type Language = {
  label: string;
  value: string;
};

export interface Doc {
  title: string;
  items: DocItem[];
}

export interface DocItem {
  title: string;
  component: string;
  describe: string;
  version: string;
  filePath: string;
}

export type SearchData = {
  docs: Doc[] | DocItem[];
  isEmptyQuery: boolean;
};

export type DetailsData = {
  name: string;
  path: string;
  content: string;
};
