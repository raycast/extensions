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

export interface NewEpicData extends Pick<EpicData, "name" | "description"> {}

export interface Preferences {
  templateEventUrl: string;
  epicSortMethod: "addedTime" | "lastUsedTime" | "nameAsc" | "nameDesc";
  bringActiveEpicToTop: boolean;
}
