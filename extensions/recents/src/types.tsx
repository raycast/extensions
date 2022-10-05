export type Scope = {
  query: string;
  directories: string[];
  filters?: boolean;
};

export type ScopeDictionary = {
  [index: string]: Scope;
};

export type SpotlightResult = {
  kMDItemPath: string;
  kMDItemDisplayName: string;
  kMDItemKind: string;
  kMDItemLastUsedDate: string;
};
