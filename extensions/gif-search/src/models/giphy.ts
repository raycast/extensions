import { formatRelative } from "date-fns";

import type { IGif as GiphyGif } from "@giphy/js-types";

import { APIOpt, IGif, IGifAPI, slugify } from "../models/gif";
import { getGiphyLocale } from "../preferences";

const API_BASE_URL = "https://gif-search.raycast.com/api/giphy";

export default async function giphy(type?: "gifs" | "videos") {
  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const reqUrl = new URL(API_BASE_URL);
      reqUrl.searchParams.set("q", term);
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");
      reqUrl.searchParams.set("offset", opt?.offset?.toString() ?? "0");
      reqUrl.searchParams.set("lang", getGiphyLocale());

      if (type) {
        reqUrl.searchParams.set("type", type);
      }

      const response = await fetch(reqUrl.toString());
      if (!response.ok) {
        throw new Error("Could not search gifs from Giphy");
      }
      const results = await response.json();
      return { results: results.data.map(mapGiphyResponse) };
    },

    async trending(opt?: APIOpt) {
      const reqUrl = new URL(API_BASE_URL);
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");
      reqUrl.searchParams.set("offset", opt?.offset?.toString() ?? "0");
      reqUrl.searchParams.set("lang", getGiphyLocale());

      if (type) {
        reqUrl.searchParams.set("type", type);
      }

      const response = await fetch(reqUrl.toString());
      if (!response.ok) {
        throw new Error("Could not get trending gifs from Giphy");
      }

      const results = await response.json();
      return { results: results.data.map(mapGiphyResponse) };
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const reqUrl = new URL(API_BASE_URL);
      reqUrl.searchParams.set("ids", ids.join(","));

      const response = await fetch(reqUrl.toString());
      const results = await response.json();
      return results.data.map(mapGiphyResponse);
    },
  };
}

export function mapGiphyResponse(giphyResp: GiphyGif) {
  const title = giphyResp.title || giphyResp.slug;
  const slug = slugify(title);

  const isGiphyClip = giphyResp.type === "video";
  const gif_url = giphyResp.images.original.url;
  const download_url = isGiphyClip
    ? (giphyResp.video?.assets["1080p"]?.url ??
      giphyResp.video?.assets["720p"]?.url ??
      giphyResp.video?.assets["360p"].url ??
      gif_url)
    : gif_url;
  const isMP4 = /\.mp4(\?|$)/.test(download_url);

  return <IGif>{
    id: giphyResp.id,
    title: title,
    url: giphyResp.url,
    slug: slugify(title),
    download_url,
    download_name: `${slug}.${isGiphyClip && isMP4 ? "mp4" : "gif"}`,
    preview_gif_url: isGiphyClip ? gif_url : giphyResp.images.preview_gif.url,
    gif_url,
    metadata: {
      width: giphyResp.images.original.width,
      height: giphyResp.images.original.height,
      size: parseInt(giphyResp.images.original.size ?? "", 10) ?? 0,
      labels: [
        {
          title: "Created",
          text: formatRelative(new Date(giphyResp.import_datetime), new Date()),
        },
        giphyResp.username && { title: "User", text: giphyResp.username },
      ],
      links: [
        giphyResp.source && {
          title: "Source",
          text: giphyResp.source_tld,
          target: giphyResp.source,
        },
      ],
      tags: giphyResp.tags,
    },
    attribution: "giphy-logo-square-180.png",
    video: giphyResp.video,
  };
}
