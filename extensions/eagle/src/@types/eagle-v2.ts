export type EagleItem = {
  id: string;
  name: string;
  ext: string;
  size?: number;
  width?: number;
  height?: number;
  url?: string;
  annotation?: string;
  tags?: string[];
  folders?: string[];
  star?: number;
  isDeleted?: boolean;
  modificationTime?: number;
};

export type EagleFolder = { id: string; name: string; children?: EagleFolder[] };
export type EagleLibrary = { name: string; path: string; folders: EagleFolder[] };
export type EaglePage<T> = { data: T[]; total: number; offset: number; limit: number };
export type ItemFilters = {
  id?: string;
  ids?: string[];
  tags?: string[];
  folders?: string[];
  ext?: string;
  url?: string;
  rating?: number;
  offset?: number;
  limit?: number;
};
export type ItemChanges = Partial<Pick<EagleItem, "name" | "url" | "annotation" | "tags" | "folders" | "star">>;
export type ItemImport = {
  id: string;
  path?: string;
  url?: string;
  name?: string;
  website?: string;
  annotation?: string;
  tags?: string[];
  folders?: string[];
};

export interface EagleClient {
  library(): Promise<EagleLibrary>;
  items(filters: ItemFilters): Promise<EaglePage<EagleItem>>;
  query(query: string, offset: number, limit: number): Promise<EaglePage<EagleItem>>;
  add(item: ItemImport): Promise<{ id: string }>;
  update(id: string, changes: ItemChanges): Promise<EagleItem>;
}
