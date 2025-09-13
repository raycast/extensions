export interface Gif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

export interface TenorResult {
  id: string;
  content_description: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
    nanogif: { url: string };
  };
}

export interface TenorResponse {
  results: TenorResult[];
  next: string;
}
