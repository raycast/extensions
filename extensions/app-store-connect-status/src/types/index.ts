// App Store Connect API response types

export interface App {
  id: string;
  type: "apps";
  attributes: {
    name: string;
    bundleId: string;
    sku: string;
    primaryLocale: string;
  };
  relationships?: {
    appStoreVersions?: {
      data?: Array<{ id: string; type: string }>;
    };
  };
}

export interface AppStoreVersion {
  id: string;
  type: "appStoreVersions";
  attributes: {
    platform: Platform;
    versionString: string;
    appStoreState: AppStoreState;
    createdDate: string;
    releaseType?: "MANUAL" | "AFTER_APPROVAL" | "SCHEDULED";
    earliestReleaseDate?: string;
  };
  relationships?: {
    appStoreVersionLocalizations?: {
      data?: Array<{ id: string; type: string }>;
    };
  };
}

export interface AppStoreVersionLocalization {
  id: string;
  type: "appStoreVersionLocalizations";
  attributes: {
    locale: string;
    description?: string;
    whatsNew?: string;
    keywords?: string;
    promotionalText?: string;
  };
}

export type Platform = "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";

export type AppStoreState =
  | "ACCEPTED"
  | "DEVELOPER_REJECTED"
  | "DEVELOPER_REMOVED_FROM_SALE"
  | "IN_REVIEW"
  | "INVALID_BINARY"
  | "METADATA_REJECTED"
  | "PENDING_APPLE_RELEASE"
  | "PENDING_CONTRACT"
  | "PENDING_DEVELOPER_RELEASE"
  | "PREPARE_FOR_SUBMISSION"
  | "PREORDER_READY_FOR_SALE"
  | "PROCESSING_FOR_APP_STORE"
  | "READY_FOR_REVIEW"
  | "READY_FOR_SALE"
  | "REJECTED"
  | "REMOVED_FROM_SALE"
  | "REPLACED_WITH_NEW_VERSION"
  | "WAITING_FOR_EXPORT_COMPLIANCE"
  | "WAITING_FOR_REVIEW";

// Processed app data for UI
export interface ProcessedApp {
  id: string;
  name: string;
  bundleId: string;
  latestVersion?: {
    id: string;
    versionString: string;
    state: AppStoreState;
    platform: Platform;
    createdDate: string;
    releaseType?: "MANUAL" | "AFTER_APPROVAL" | "SCHEDULED";
  };
  appStoreConnectUrl: string;
}

// API response structure - node-app-store-connect-api returns included as nested object
export interface ApiResponse {
  data: App[];
  included?: {
    appStoreVersions?: Record<string, AppStoreVersion>;
    appStoreVersionLocalizations?: Record<string, AppStoreVersionLocalization>;
  };
}

