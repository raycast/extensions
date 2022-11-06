import { getPreferenceValues } from "@raycast/api";
import urlJoin from "url-join";
import fs from "fs";
import { pipeline } from "stream";
import util from "util";
const streamPipeline = util.promisify(pipeline);

export interface Hit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  collections: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface ImageSearchResult {
  total: number;
  totalHits: number;
  hits?: Hit[];
}

export interface Video {
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface Videos {
  large: Video;
  medium: Video;
  small: Video;
  tiny: Video;
}

export interface VideoHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  picture_id: string;
  videos: Videos;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface VideoSearchResult {
  total: number;
  totalHits: number;
  hits: VideoHit[];
}

class PixabayClient {
  private apikey?: string;
  constructor() {
    const prefs = getPreferenceValues();
    this.apikey = prefs.apikey as string | undefined;
  }

  public async fetch(url: string, params: URLSearchParams | undefined): Promise<any> {
    const fullUrl = urlJoin("https://pixabay.com/api", url);

    const fullParams = new URLSearchParams();
    if (params) {
      params.forEach((v, k) => {
        fullParams.append(k, v);
      });
    }
    if (this.apikey) {
      fullParams.append("key", this.apikey);
    } else {
      throw Error("No API key defined");
    }
    const encodedUrl = fullUrl + "/?" + fullParams.toString();
    console.log(encodedUrl);
    const response = await fetch(encodedUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      return await response.json();
    }
    throw Error("Could not fetch data from pixabay");
  }

  async downloadFile(url: string, params: { localFilepath: string }): Promise<void> {
    if (fs.existsSync(params.localFilepath)) {
      console.log("use cache");
      return;
    }
    const response = await fetch(url, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error("");
    }
    console.log(`write ${url} to ${params.localFilepath}`);
    await streamPipeline(response.body as any, fs.createWriteStream(params.localFilepath));
  }

  async searchImages(query: string | undefined): Promise<ImageSearchResult | undefined> {
    if (!query || query.length <= 0) {
      return;
    }
    const params = new URLSearchParams();
    if (query) {
      params.append("q", query);
    }
    const data = (await this.fetch("", params)) as ImageSearchResult | undefined;
    return data;
  }

  async searchVideos(query: string | undefined): Promise<VideoSearchResult | undefined> {
    if (!query || query.length <= 0) {
      return;
    }
    const params = new URLSearchParams();
    if (query) {
      params.append("q", query);
    }
    const data = (await this.fetch("videos", params)) as VideoSearchResult | undefined;
    return data;
  }
}

export const Pixabay = new PixabayClient();
