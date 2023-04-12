export interface Owner {
  name: string;
  searchTerm: string;
}

export interface Preferences {
  clonePath: string;
  editorCommand: string;
  token: string;
}

export interface Repository {
  cloneUrl: string;
  description: string;
  name: string;
  owner: string;
}
