export interface Language {
  id: string;
  name: string;
  abbreviation: string | undefined;
  color: string;
}

export interface NotebookEntry {
  id: string;
  word: string;
  translation: string;
  timestamp: number;
  languageId: string;
}

export interface Data {
  languages: Language[];
  entries: NotebookEntry[];
}
