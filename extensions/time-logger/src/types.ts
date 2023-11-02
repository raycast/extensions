export interface InProgressEpicData {
  name: string;
  workStartedTimestamp?: number;
}

export interface EpicData {
  name: string;
  addedTimestamp: number;
  lastUsedTimestamp?: number;
  description?: string;
}

export interface Preferences {
  templateEventUrl: string;
  locale: "en" | "ja";
  epicSortMethod: "addedTime" | "lastUsedTime" | "nameAsc" | "nameDesc";
  bringActiveEpicToTop: boolean;
}
