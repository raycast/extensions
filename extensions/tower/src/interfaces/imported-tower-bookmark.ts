export default interface ImportedTowerBookmarks {
  children: ImportedTowerBookmark[];
}

export interface ImportedTowerBookmark {
  fileURL: string;
  lastOpenedDate: number;
  name: string;
  repositoryIdentifier: string;
  type: number;
  valid: boolean;
  children: ImportedTowerBookmark[];
}
