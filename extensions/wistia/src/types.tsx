export interface Preferences {
  wistiaApiToken: string;
}

export enum MediaType {
  Video = "Video",
  Audio = "audio",
}

export interface WistiaMedia {
  id: number;
  name: string;
  description: string;
  duration: number;
  hashed_id: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  type: MediaType;
  section: string;
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
