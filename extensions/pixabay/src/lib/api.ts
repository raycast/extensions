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
    console.log("url: ", url);
    if (fs.existsSync(params.localFilepath)) {
      console.log("use cache");
      return;
    }
    console.log(`download ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer a`,
      },
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
}

export const Pixabay = new PixabayClient();
