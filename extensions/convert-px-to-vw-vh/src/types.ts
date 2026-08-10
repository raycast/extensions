export type SizeTheme = {
  value: string;
  label: string;
};

export type HistoryItem = {
  date: string;
  data: SizeTheme;
};

export interface Option {
  value: string;
  title: string;
}

export interface SizeOption {
  label: string;
  options: Option[];
}

export type Values = {
  textfield: string;
  dropdown: string;
};

export type Sizes = {
  pixels: number;
  height: number | null;
  width: number | null;
};
