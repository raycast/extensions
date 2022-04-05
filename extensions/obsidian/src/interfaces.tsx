export interface FormValue {
  path: string;
  name: string;
  content: string;
  tags: Array<string>;
}

export interface Preferences {
  vaultPath: string;
}

export interface NoteFormPreferences extends Preferences {
  prefPath: string;
  prefTag: string;
  tags: string;
}

export interface SearchNotePreferences extends Preferences {
  primaryAction: string;
  excludedFolders: string;
  removeYAML: boolean;
  removeLinks: boolean;
  appendPrefix: string;
}

export interface Vault {
  name: string;
  key: string;
  path: string;
}

export interface Note {
  title: string;
  key: number;
  path: string;
}
