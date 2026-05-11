export interface PhotoItem {
  path: string;
  name: string;
  size: number;
  modifiedAt: Date;
  createdAt: Date;
}

export type ActionKind = "keep" | "trash" | "skip";

export interface ActionRecord {
  kind: ActionKind;
  photo: PhotoItem;
  pendingTrashPath?: string;
}

export interface SessionState {
  photos: PhotoItem[];
  currentIndex: number;
  actions: ActionRecord[];
  kept: number;
  trashed: number;
  skipped: number;
  spaceFreed: number;
  isComplete: boolean;
}

export type SessionAction =
  | { type: "keep" }
  | { type: "trash"; pendingTrashPath: string }
  | { type: "skip" }
  | { type: "undo" }
  | { type: "init"; photos: PhotoItem[] };
