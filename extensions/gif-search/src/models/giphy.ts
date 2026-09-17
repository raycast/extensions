import { formatRelative } from "date-fns";

import type { IGif as GiphyGif } from "@giphy/js-types";

import { APIOpt, createGifLookupUrl, IGif, IGifAPI, slugify } from "../models/gif";
import { getGiphyLocale } from "../preferences";
import { fetchProviderJson } from "../lib/fetchProviderJson";

const API_BASE_URL = "https://gif-search.raycast.com/api/giphy";
type GiphyResults = { data: GiphyGif[] };

function getGiphyUrl(type: "gifs" | "videos" | undefined, opt?: APIOpt) {
  const reqUrl = new URL(API_BASE_URL);
  reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");
  reqUrl.searchParams.set("offset", opt?.offset?.toString() ?? "0");
  reqUrl.searchParams.set("lang", getGiphyLocale());

  if (type) {
    reqUrl.searchParams.set("type", type);
  }

  return reqUrl;
}

export default async function giphy(type?: "gifs" | "videos") {
  const provider = type === "videos" ? "GIPHY Clips" : "GIPHY";

  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const reqUrl = getGiphyUrl(type, opt);
      reqUrl.searchParams.set("q", term);

      const results = await fetchProviderJson<GiphyResults>(reqUrl, { provider, request: "search" });
      return { results: results.data.map(mapGiphyResponse) };
    },

    async trending(opt?: APIOpt) {
      const reqUrl = getGiphyUrl(type, opt);

      const results = await fetchProviderJson<GiphyResults>(reqUrl, { provider, request: "trending" });
      return { results: results.data.map(mapGiphyResponse) };
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const reqUrl = createGifLookupUrl(API_BASE_URL, ids);
      const results = await fetchProviderJson<GiphyResults>(reqUrl, { provider, request: "GIF lookup" });
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
    small_preview_gif_url: isGiphyClip ? gif_url : giphyResp.images.preview_gif.url,
    large_preview_gif_url: isGiphyClip ? gif_url : giphyResp.images.fixed_height_small.url,
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
