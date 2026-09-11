export interface Drive {
  id: string;
  name: string;
  driveType: string;
  owner?: {
    user?: {
      displayName: string;
      email?: string;
    };
  };
  webUrl: string;
  siteDisplayName?: string;
}

export interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  folder?: { childCount: number };
  file?: {
    mimeType: string;
    hashes?: {
      quickXorHash?: string;
    };
  };
  createdBy?: {
    user?: {
      displayName: string;
      email?: string;
    };
  };
  lastModifiedBy?: {
    user?: {
      displayName: string;
      email?: string;
    };
  };
  parentReference?: {
    id: string;
    name: string;
    driveId: string;
    driveType: string;
    path: string;
  };
  thumbnails?: Array<{
    id: string;
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
  }>;
  image?: {
    width: number;
    height: number;
  };
  photo?: {
    takenDateTime?: string;
    cameraMake?: string;
    cameraModel?: string;
    fNumber?: number;
    exposureDenominator?: number;
    exposureNumerator?: number;
    focalLength?: number;
    iso?: number;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  video?: {
    audioBitsPerSample?: number;
    audioChannels?: number;
    audioFormat?: string;
    audioSamplesPerSecond?: number;
    bitrate?: number;
    duration?: number;
    fourCC?: string;
    frameRate?: number;
    height?: number;
    width?: number;
  };
  "@microsoft.graph.downloadUrl"?: string;
  webDavUrl?: string;
}

export interface SearchResult {
  value: DriveItem[];
  "@odata.nextLink"?: string;
}

export interface PaginatedResult {
  items: DriveItem[];
  nextLink?: string;
}

export interface DrivesResult {
  value: Drive[];
}

export interface Site {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface SitesResult {
  value: Site[];
}

export interface BreadcrumbPath {
  id: string;
  name: string;
}

export type SortOption = "relevance" | "lastModifiedDateTime";

export interface SortConfig {
  field: SortOption;
  direction: "asc" | "desc";
}
