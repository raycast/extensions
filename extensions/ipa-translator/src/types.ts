export interface DictionaryItem {
  original: string;
  ipa: string;
}

export interface Dictionary {
  dict: DictionaryItem[];
}

export enum Languages {
  English = "English",
  Danish = "Danish",
  German = "German",
  Swedish = "Swedish",
  Czech = "Czech",
}
