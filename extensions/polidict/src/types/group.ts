export type GroupAccessType = "PUBLIC" | "PRIVATE";

export interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  accessType?: GroupAccessType;
}

export interface UnsavedGroup {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface GroupList {
  groups: Group[];
  hasNext: boolean;
}
