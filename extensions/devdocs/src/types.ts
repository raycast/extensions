export interface Doc {
  name: string;
  slug: string;
  type: string;
  links?: Links;
  version: string;
  release: string;
  mtime: number;
  db_size: number;
  alias?: string;
}

export interface Links {
  home?: string;
  code?: string;
}

export interface Index {
  entries: Entry[];
  types: Type[];
}

export interface Entry {
  name: string;
  path: string;
  type: string;
}

export interface Type {
  name: string;
  count: number;
  slug: string;
}

export interface Preferences {
  primaryOpenInAction: string;
}
