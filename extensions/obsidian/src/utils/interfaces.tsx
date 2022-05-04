export interface FormValue {
  path: string;
  name: string;
  content: string;
  tags: string[];
}

export interface Preferences {
  vaultPath: string;
}

export interface NoteFormPreferences extends Preferences {
  prefPath: string;
  prefTag: string;
  tags: string;
  openOnCreate: boolean;
  prefNoteName: string;
  folderActions: string;
}

export interface SearchNotePreferences extends Preferences {
  primaryAction: string;
  excludedFolders: string;
  removeYAML: boolean;
  removeLinks: boolean;
  removeLatex: boolean;
  appendPrefix: string;
  showDetail: boolean;
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
