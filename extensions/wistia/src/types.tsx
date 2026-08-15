export enum MediaType {
  Video = "Video",
  Audio = "Audio",
  Image = "Image",
  PdfDocument = "PdfDocument",
  MicrosoftOfficeDocument = "MicrosoftOfficeDocument",
  Swf = "Swf",
  UnknownType = "UnknownType",
}
export enum MediaStatus {
  queued = "queued",
  processing = "processing",
  ready = "ready",
  failed = "failed",
}

export interface WistiaMedia {
  id: number;
  name: string;
  description: string;
  duration?: number;
  hashed_id: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  type: MediaType;
  section: string;
  status: MediaStatus;
}

export interface EmbedObject {
  type: MediaType;
  html: string;
}

export interface WistiaProject {
  id: number;
  description: string;
  name: string;
  mediaCount: number;
  hashedId: string;
  medias?: WistiaMedia[];
}
export interface WistiaStats {
  load_count: number;
  play_count: number;
  hours_watched: number;
}

export interface AccountInfo {
  id: number;
  name: string;
  url: string;
  mediaCount: number;
  videoLimit: number;
}

export interface WistiaApiError {
  code: string;
  error: string;
}
