export const INTERNAL_STORAGE_ROOT = "/storage/emulated/0";

export interface BooxDevice {
  id: string;
  host: string;
  screenHost: string;
  model: string;
  nickname?: string;
  storageTotal?: number;
  storageUsed?: number;
  lastSeenAt: number;
  screenAvailable: boolean;
}

export interface DeviceResponse {
  id?: string;
  host?: string;
  model?: string;
  nickname?: string;
  storageTotal?: number | string;
  storageUsed?: number | string;
  type?: string;
}

export interface StorageEntry {
  dir: boolean;
  name: string;
  path: string;
  size: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface StoragePage {
  count: number;
  fileCount: number;
  folderCount: number;
  list: StorageEntry[];
}

export interface LibraryBook {
  id: string;
  title: string;
  name: string;
  path: string;
  format: string;
  coverPath?: string;
  authors: string[];
  size: number;
  progress?: string;
  progressPercent: number;
  lastAccess?: Date;
  updatedAt?: Date;
  favorite: boolean;
  rating: number;
  tags: string[];
}

export interface LibraryShelf {
  id: string;
  title: string;
  childCount: number;
  coverPath?: string;
}

export interface LibraryPage {
  bookCount: number;
  shelfCount: number;
  books: LibraryBook[];
  shelves: LibraryShelf[];
}

export interface BooxNote {
  id: string;
  title: string;
  pageCount: number;
  coverPath?: string;
  createdAt?: Date;
  updatedAt?: Date;
  favorite: boolean;
  encrypted: boolean;
  folder: boolean;
}

export interface NotesPage {
  count: number;
  fileCount: number;
  folderCount: number;
  notes: BooxNote[];
}

export interface MediaCategory {
  name: string;
  type: string;
  path?: string;
  count: number;
}

export type TransferMode = "storage" | "library";
export type ConflictPolicy = "skip" | "replace";

export interface TransferItemResult {
  path: string;
  name: string;
  status: "uploaded" | "skipped" | "failed";
  error?: string;
  indexed?: boolean;
}

export interface TransferResult {
  items: TransferItemResult[];
  uploaded: number;
  skipped: number;
  failed: number;
}
