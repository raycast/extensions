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

export type SavedItemDto = {
  readonly tags: readonly (
    | "ai"
    | "tools"
    | "typescript"
    | "security"
    | "design"
    | "backend"
    | "front-end"
  )[];
  readonly id: string;
  readonly originalUrl: string;
  readonly normalizedUrl: string;
  readonly host: string;
  readonly type: "article" | "video" | "website" | "repository";
  readonly enrichmentStatus: "pending" | "enriched" | "failed";
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
    readonly tags: readonly (
      | "ai"
      | "tools"
      | "typescript"
      | "security"
      | "design"
      | "backend"
      | "front-end"
    )[];
    readonly id: string;
    readonly originalUrl: string;
    readonly normalizedUrl: string;
    readonly host: string;
    readonly type: "article" | "video" | "website" | "repository";
    readonly enrichmentStatus: "pending" | "enriched" | "failed";
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
  readonly captureResult: "created";
  readonly savedItem: {
    readonly tags: readonly (
      | "ai"
      | "tools"
      | "typescript"
      | "security"
      | "design"
      | "backend"
      | "front-end"
    )[];
    readonly id: string;
    readonly originalUrl: string;
    readonly normalizedUrl: string;
    readonly host: string;
    readonly type: "article" | "video" | "website" | "repository";
    readonly enrichmentStatus: "pending" | "enriched" | "failed";
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
};

export type CaptureUpdated = {
  readonly captureResult: "updated";
  readonly savedItem: {
    readonly tags: readonly (
      | "ai"
      | "tools"
      | "typescript"
      | "security"
      | "design"
      | "backend"
      | "front-end"
    )[];
    readonly id: string;
    readonly originalUrl: string;
    readonly normalizedUrl: string;
    readonly host: string;
    readonly type: "article" | "video" | "website" | "repository";
    readonly enrichmentStatus: "pending" | "enriched" | "failed";
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
};

export type HealthResponse = { readonly ok: boolean };

export type CapturePayload = {
  readonly url: string;
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

export type SavedItemReadStatePayload = { readonly isRead: boolean };

export type SavedItemsQuery = {
  readonly sort?: "title" | "newest" | "oldest" | "unread" | undefined;
};

export type Unauthorized = {
  readonly _tag: "Unauthorized";
  readonly message: string;
};

export type RateLimitExceeded = {
  readonly _tag: "RateLimitExceeded";
  readonly message: string;
};

export type InvalidUrlError = {
  readonly url: string;
  readonly _tag: "InvalidUrlError";
  readonly message: string;
};

export type SavedItemNotFoundError = {
  readonly _tag: "SavedItemNotFoundError";
  readonly message: string;
  readonly savedItemId: string;
};

export type CaptureResponse = CaptureCreated | CaptureUpdated;

export type ApiError =
  | Unauthorized
  | RateLimitExceeded
  | InvalidUrlError
  | SavedItemNotFoundError;
