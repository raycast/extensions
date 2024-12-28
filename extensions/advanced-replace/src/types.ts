export type RegexItem = {
  key: string;
  regex: string;
};

export interface ReplacementOption {
  id: string;
  title: string;
  description?: string;
  output: string;
  regexItems: RegexItem[];
}

export type Match = {
  key: string;
  match: string | undefined;
};
