import fetch from "cross-fetch";
import fs from "fs";
import { pipeline } from "stream";
import urlJoin from "url-join";
import util from "util";

import { getPreferenceValues } from "@raycast/api";

import type { ImageSearchResult, SearchImageType, SearchVideoType, VideoSearchResult } from "@/types";

import { getResultsPerPage, hasSafeSearch } from "@/lib/prefs";

const streamPipeline = util.promisify(pipeline);

class PixabayClient {
  private apikey?: string;
  constructor() {
    const prefs = getPreferenceValues();
    this.apikey = prefs.apikey as string | undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      return;
    }
    const response = await fetch(url, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error("Bad response body");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await streamPipeline(response.body as any, fs.createWriteStream(params.localFilepath));
  }

  async searchImages(
    query: string | undefined,
    opts: {
      imagetype?: SearchImageType;
    } = {},
  ): Promise<ImageSearchResult | undefined> {
    if (!query || query.length <= 0) {
      return;
    }
    const params = new URLSearchParams();
    params.append("per_page", getResultsPerPage().toString());
    if (query) {
      params.append("q", query);
    }
    if (opts.imagetype) {
      params.append("image_type", opts.imagetype);
    }
    if (hasSafeSearch()) {
      params.append("safesearch", "true");
    }

    console.log("searchImages", query, params.toString());
    const data = (await this.fetch("", params)) as ImageSearchResult | undefined;
    return data;
  }

  async searchVideos(
    query: string | undefined,
    opts: {
      videotype?: SearchVideoType;
    } = {},
  ): Promise<VideoSearchResult | undefined> {
    if (!query || query.length <= 0) {
      return;
    }
    const params = new URLSearchParams();
    params.append("per_page", getResultsPerPage().toString());
    if (query) {
      params.append("q", query);
    }
    if (opts.videotype) {
      params.append("video_type", opts.videotype);
    }
    if (hasSafeSearch()) {
      params.append("safesearch", "true");
    }
    const data = (await this.fetch("videos", params)) as VideoSearchResult | undefined;
    return data;
  }
}

export const Pixabay = new PixabayClient();
