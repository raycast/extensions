// =============================================================================
// AUTO-GENERATED — DO NOT EDIT
// Source: packages/contract/src/index.ts
// Generator: scripts/sync-raycast-contract.mjs (run by Husky pre-commit hook)
// =============================================================================

export const linkTypes = ["article", "video", "website", "repository"] as const;
export type LinkType = "article" | "video" | "website" | "repository";

export const topics = [
  "ai",
  "tools",
  "typescript",
  "security",
  "design",
  "backend",
  "front-end",
] as const;
export type Topic =
  | "ai"
  | "tools"
  | "typescript"
  | "security"
  | "design"
  | "backend"
  | "front-end";

export const captureChannels = [
  "chrome-extension",
  "ios-app",
  "ios-share-extension",
  "raycast",
  "web-companion",
  "api",
] as const;
export type CaptureChannel =
  | "chrome-extension"
  | "ios-app"
  | "ios-share-extension"
  | "raycast"
  | "web-companion"
  | "api";

export const enrichmentStatuses = ["pending", "enriched", "failed"] as const;
export type EnrichmentStatus = "pending" | "enriched" | "failed";

export const savedItemSorts = ["newest", "oldest", "title", "unread"] as const;
export type SavedItemSort = "title" | "newest" | "oldest" | "unread";

export type FolderDto = {
  readonly id: string;
  readonly name: string;
  readonly emoji: string | null;
  readonly color: string | null;
};

export type FoldersResponse = {
  readonly folders: readonly {
    readonly id: string;
    readonly name: string;
    readonly emoji: string | null;
    readonly color: string | null;
  }[];
};

export type SavedItemDto = {
  readonly id: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly host: string;
  readonly type: "article" | "video" | "website" | "repository";
  readonly tags: readonly (
    | "ai"
    | "tools"
    | "typescript"
    | "security"
    | "design"
    | "backend"
    | "front-end"
  )[];
  readonly enrichmentStatus: "pending" | "enriched" | "failed";
  readonly folder: {
    readonly id: string;
    readonly name: string;
    readonly emoji: string | null;
    readonly color: string | null;
  } | null;
  readonly isRead: boolean;
  readonly lastSavedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly siteName?: string | undefined;
  readonly faviconUrl?: string | undefined;
  readonly faviconLightUrl?: string | undefined;
  readonly faviconDarkUrl?: string | undefined;
  readonly imageUrl?: string | undefined;
  readonly canonicalUrl?: string | undefined;
  readonly previewSummary?: string | undefined;
  readonly sourceName?: string | undefined;
  readonly captureChannel?:
    | "chrome-extension"
    | "ios-app"
    | "ios-share-extension"
    | "raycast"
    | "web-companion"
    | "api"
    | undefined;
};

export type SavedItemsResponse = {
  readonly savedItems: readonly {
    readonly id: string;
    readonly originalUrl: string;
    readonly normalizedUrl: string;
    readonly host: string;
    readonly type: "article" | "video" | "website" | "repository";
    readonly tags: readonly (
      | "ai"
      | "tools"
      | "typescript"
      | "security"
      | "design"
      | "backend"
      | "front-end"
    )[];
    readonly enrichmentStatus: "pending" | "enriched" | "failed";
    readonly folder: {
      readonly id: string;
      readonly name: string;
      readonly emoji: string | null;
      readonly color: string | null;
    } | null;
    readonly isRead: boolean;
    readonly lastSavedAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly title?: string | undefined;
    readonly description?: string | undefined;
    readonly siteName?: string | undefined;
    readonly faviconUrl?: string | undefined;
    readonly faviconLightUrl?: string | undefined;
    readonly faviconDarkUrl?: string | undefined;
    readonly imageUrl?: string | undefined;
    readonly canonicalUrl?: string | undefined;
    readonly previewSummary?: string | undefined;
    readonly sourceName?: string | undefined;
    readonly captureChannel?:
      | "chrome-extension"
      | "ios-app"
      | "ios-share-extension"
      | "raycast"
      | "web-companion"
      | "api"
      | undefined;
  }[];
};

export type CaptureCreated = {
  readonly savedItem: {
    readonly id: string;
    readonly originalUrl: string;
    readonly normalizedUrl: string;
    readonly host: string;
    readonly type: "article" | "video" | "website" | "repository";
    readonly tags: readonly (
      | "ai"
      | "tools"
      | "typescript"
      | "security"
      | "design"
      | "backend"
      | "front-end"
    )[];
    readonly enrichmentStatus: "pending" | "enriched" | "failed";
    readonly folder: {
      readonly id: string;
      readonly name: string;
      readonly emoji: string | null;
      readonly color: string | null;
    } | null;
    readonly isRead: boolean;
    readonly lastSavedAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly title?: string | undefined;
    readonly description?: string | undefined;
    readonly siteName?: string | undefined;
    readonly faviconUrl?: string | undefined;
    readonly faviconLightUrl?: string | undefined;
    readonly faviconDarkUrl?: string | undefined;
    readonly imageUrl?: string | undefined;
    readonly canonicalUrl?: string | undefined;
    readonly previewSummary?: string | undefined;
    readonly sourceName?: string | undefined;
    readonly captureChannel?:
      | "chrome-extension"
      | "ios-app"
      | "ios-share-extension"
      | "raycast"
      | "web-companion"
      | "api"
      | undefined;
  };
  readonly captureResult: "created";
};

export type CaptureUpdated = {
  readonly savedItem: {
    readonly id: string;
    readonly originalUrl: string;
    readonly normalizedUrl: string;
    readonly host: string;
    readonly type: "article" | "video" | "website" | "repository";
    readonly tags: readonly (
      | "ai"
      | "tools"
      | "typescript"
      | "security"
      | "design"
      | "backend"
      | "front-end"
    )[];
    readonly enrichmentStatus: "pending" | "enriched" | "failed";
    readonly folder: {
      readonly id: string;
      readonly name: string;
      readonly emoji: string | null;
      readonly color: string | null;
    } | null;
    readonly isRead: boolean;
    readonly lastSavedAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly title?: string | undefined;
    readonly description?: string | undefined;
    readonly siteName?: string | undefined;
    readonly faviconUrl?: string | undefined;
    readonly faviconLightUrl?: string | undefined;
    readonly faviconDarkUrl?: string | undefined;
    readonly imageUrl?: string | undefined;
    readonly canonicalUrl?: string | undefined;
    readonly previewSummary?: string | undefined;
    readonly sourceName?: string | undefined;
    readonly captureChannel?:
      | "chrome-extension"
      | "ios-app"
      | "ios-share-extension"
      | "raycast"
      | "web-companion"
      | "api"
      | undefined;
  };
  readonly captureResult: "updated";
};

export type HealthResponse = { readonly ok: boolean };

export type CapturePayload = {
  readonly url: string;
  readonly sourceName?: string | undefined;
  readonly captureChannel?:
    | "chrome-extension"
    | "ios-app"
    | "ios-share-extension"
    | "raycast"
    | "web-companion"
    | "api"
    | undefined;
  readonly tags?:
    | readonly (
        | "ai"
        | "tools"
        | "typescript"
        | "security"
        | "design"
        | "backend"
        | "front-end"
      )[]
    | undefined;
  readonly folderId?: string | null | undefined;
};

export type SavedItemReadStatePayload = { readonly isRead: boolean };

export type SavedItemsQuery = {
  readonly sort?: "title" | "newest" | "oldest" | "unread" | undefined;
  readonly folder?: string | undefined;
};

export type FolderNamePayload = {
  readonly name: string;
  readonly emoji?: string | null | undefined;
  readonly color?: string | null | undefined;
};

export type FolderAssignmentPayload = { readonly folderId: string | null };

export type Unauthorized = {
  readonly _tag: "Unauthorized";
  readonly message: string;
};

export type RateLimitExceeded = {
  readonly _tag: "RateLimitExceeded";
  readonly message: string;
};

export type InvalidUrlError = {
  readonly _tag: "InvalidUrlError";
  readonly message: string;
  readonly url: string;
};

export type SavedItemNotFoundError = {
  readonly _tag: "SavedItemNotFoundError";
  readonly message: string;
  readonly savedItemId: string;
};

export type InvalidFolderNameError = {
  readonly _tag: "InvalidFolderNameError";
  readonly message: string;
};

export type FolderNotFoundError = {
  readonly _tag: "FolderNotFoundError";
  readonly message: string;
  readonly folderId: string;
};

export type FolderNameConflictError = {
  readonly _tag: "FolderNameConflictError";
  readonly message: string;
};

export type CaptureResponse = CaptureCreated | CaptureUpdated;

export type ApiError =
  | Unauthorized
  | RateLimitExceeded
  | InvalidUrlError
  | SavedItemNotFoundError
  | InvalidFolderNameError
  | FolderNotFoundError
  | FolderNameConflictError;
