import { RestClient } from "./rest-client";

export type ImageSource = "FLICKR" | "PEXELS" | "UNSPLASH";
export type ImageSize = "thumbnail" | "normal";

export interface ImageSearchRequest {
  text: string;
  searchPrompt?: string;
  source?: ImageSource;
  size?: ImageSize;
  page?: number;
  pageSize?: number;
}

export interface ImageAttribution {
  photographerName: string;
  photographerUrl: string;
  photoUrl: string;
}

export interface ImageResultDto {
  url: string;
  attribution?: ImageAttribution | null;
  downloadTrackingUrl?: string | null;
}

export interface ImageSearchResponse {
  results: ImageResultDto[];
  source: ImageSource;
}

export class ImagesClient {
  constructor(private readonly restClient: RestClient) {}

  async trackDownload(downloadTrackingUrl: string): Promise<void> {
    await this.restClient.post("/api/images/track-download", {
      downloadTrackingUrl,
    });
  }

  async searchImages(request: ImageSearchRequest): Promise<ImageSearchResponse> {
    const params: Record<string, string> = {
      text: request.text,
    };

    if (request.searchPrompt) {
      params.searchPrompt = request.searchPrompt;
    }
    if (request.source) {
      params.source = request.source;
    }
    if (request.size) {
      params.size = request.size;
    }
    if (request.page !== undefined) {
      params.page = request.page.toString();
    }
    if (request.pageSize !== undefined) {
      params.pageSize = request.pageSize.toString();
    }

    return this.restClient.get<ImageSearchResponse>("/api/images", params);
  }
}
