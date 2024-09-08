export type Language = {
  label: string;
  value: string;
};

export type Documentation = Record<string, Doc[]>;

export interface Doc {
  title: string;
  items: DocItem[];
}

export interface DocItem {
  title: string;
  url: string;
  subTitle: string;
}
