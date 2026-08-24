export type Pocket = {
  /** Path of the Pocket's directory relative to the Wallet root; undefined for the Wallet root itself. */
  name?: string;
  cards: Card[];
};

export type Card = {
  name: string;
  path: string;
  preview?: string;
  /** File extension, lowercased and without the leading dot. Empty for extensionless files. */
  extension: string;
  size: number;
  mtimeMs: number;
  createdAtMs: number;
};

export type ThumbnailLayout = "inset" | "contain" | "fill";

export interface Preferences {
  walletDirectory: string;
  thumbnailLayout: ThumbnailLayout;
  gridColumns: string;
  videoPreviews: boolean;
  rememberPocketFilter: boolean;
}

export type SortMode =
  | "name-asc"
  | "name-desc"
  | "date-added-desc"
  | "date-added-asc"
  | "date-modified-desc"
  | "date-modified-asc"
  | "size-desc"
  | "size-asc"
  | "recent"
  | "frequent";

export interface UsageEntry {
  count: number;
  lastUsedAt: number;
}

export type UsageStats = Record<string, UsageEntry>;

export type WalletStatus = "ready" | "missing" | "not-found";
