import formatRelative from "date-fns/formatRelative";

import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif as GiphyGif } from "@giphy/js-types";

import { getAPIKey, GIF_SERVICE } from "../preferences";

import { APIOpt, IGif, IGifAPI, slugify } from "../models/gif";

let gf: GiphyFetch;
export async function getAPI(force?: boolean) {
  if (!gf || force) {
    gf = new GiphyFetch(await getAPIKey(GIF_SERVICE.GIPHY, force));
  }

  return gf;
}

export default async function giphy(force?: boolean, type?: "gifs" | "videos") {
  const api = await getAPI(force);

  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const { offset = 0, limit } = opt || {};
      return (await api.search(term, { type, offset, limit })).data.map(mapGiphyResponse);
    },

    async trending(opt?: APIOpt) {
      const { offset = 0, limit = 10 } = opt || {};
      return (await api.trending({ type, offset, limit })).data.map(mapGiphyResponse);
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const { data } = await api.gifs(ids);
      return data.map(mapGiphyResponse);
    },
  };
}

export function mapGiphyResponse(giphyResp: GiphyGif) {
  const title = giphyResp.title || giphyResp.slug;
  const slug = slugify(title);

  const isGiphyClip = giphyResp.type === "video";
  const gif_url = giphyResp.images.fixed_height.url;
  const download_url = isGiphyClip
    ? giphyResp.video?.assets["720p"]?.url ?? giphyResp.video?.assets["360p"].url ?? gif_url
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
        { title: "Created", text: formatRelative(new Date(giphyResp.import_datetime), new Date()) },
        giphyResp.username && { title: "User", text: giphyResp.username },
      ],
      links: [giphyResp.source && { title: "Source", text: giphyResp.source_tld, target: giphyResp.source }],
      tags: giphyResp.tags,
    },
    attribution: "giphy-logo-square-180.png",
    video: giphyResp.video,
  };
}
