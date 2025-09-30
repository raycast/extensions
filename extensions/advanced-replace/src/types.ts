export type RegexItemCutPaste = {
  id: string;
  key: string;
  regex: string;
};

export type RegexItemDirectReplace = {
  id: string;
  regex: string;
  replacement: string;
  matchGlobally?: boolean;
  matchCaseInsensitive?: boolean;
  matchMultiline?: boolean;
};

export interface EntryBase {
  id: string;
  type: "cutPaste" | "directReplace";
  title: string;
  description?: string;
  lastUsed: Date;
}

export interface EntryCutPaste extends EntryBase {
  type: "cutPaste";
  output: string;
  regexItems: RegexItemCutPaste[];
}

export interface EntryDirectReplace extends EntryBase {
  type: "directReplace";
  regexItems: RegexItemDirectReplace[];
}

export type Entry = EntryCutPaste | EntryDirectReplace;

export type Match = {
  key: string;
  match: string | undefined;
};
