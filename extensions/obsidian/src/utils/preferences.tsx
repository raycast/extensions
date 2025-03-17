export interface GlobalPreferences {
  vaultPath: string;
  removeYAML: boolean;
  removeLinks: boolean;
  removeLatex: boolean;
  excludedFolders: string;
}

export interface AppendNotePreferences {
  appendTemplate: string;
  appendSelectedTemplate: string;
}
export interface NoteFormPreferences extends GlobalPreferences {
  blankNote: boolean;
  prefPath: string;
  prefNoteName: string;
  prefNoteContent: string;
  fillFormWithDefaults: boolean;
  prefTag: string;
  tags: string;
  openOnCreate: boolean;
  folderActions: string;
}

export interface SearchNotePreferences extends GlobalPreferences, AppendNotePreferences {
  primaryAction: string;
  showDetail: boolean;
  showMetadata: boolean;
  searchContent: boolean;
  fuzzySearch: boolean;
}

export interface RandomNotePreferences extends GlobalPreferences, AppendNotePreferences {}

export interface SearchMediaPreferences extends GlobalPreferences {
  imageSize: string;
}

export interface DailyNoteAppendPreferences {
  appendTemplate?: string;
  vaultName?: string;
  heading?: string;
  prepend?: boolean;
  silent?: boolean;
}

export interface appendTaskPreferences {
  appendTemplate?: string;
  vaultName?: string;
  heading?: string;
  notePath?: string;
  noteTag?: string;
  silent?: boolean;
  creationDate?: boolean;
}
