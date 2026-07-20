export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  type: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface LocationSuggestion {
  path: string;
  confidence: number;
  reason: string;
}
