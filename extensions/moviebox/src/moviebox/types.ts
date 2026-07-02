export interface StreamResource {
  resourceLink?: string;
  fileUrl?: string;
  path?: string;
  resolution?: number;
  resourceId?: string;
}

export interface StreamData {
  list?: StreamResource[];
  items?: StreamResource[];
}

export interface CaptionsResponse {
  extCaptions?: {
    url: string;
    lan: string;
    lanName: string;
  }[];
}

export interface SubjectItem {
  subjectId: string;
  title?: string;
  subjectTitle?: string;
  poster?: string;
  cover?: { url: string };
  description?: string;
  releaseDate?: string;
  durationSeconds?: number;
  genre?: string | string[];
  type?: string;
  subjects?: SubjectItem[];
  dubs?: { subjectId: string; lanName: string }[];
  resourceDetectors?: { resolutionList: { resolution: number }[] }[];
  episodes?: {
    episode: number;
    title: string;
    releaseDate?: string;
    durationSeconds?: number;
  }[];
  category?: string;
  imdbRatingValue?: number;
  imdbRate?: number;
  seasons?: {
    seasons: {
      se: number;
      maxEp?: number;
      resolutions?: { resolution: number }[];
    }[];
  };
}

export interface SearchResponse {
  items?: SubjectItem[];
  subjects?: SubjectItem[];
}

export interface HomepageSection {
  title?: string;
  subjects?: SubjectItem[];
  items?: SubjectItem[];
}

export interface HomepageResponse {
  items?: HomepageSection[];
}
