import formatRelative from "date-fns/formatRelative";

import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif as GiphyGif } from "@giphy/js-types";
import { environment } from "@raycast/api";

import { getAPIKey, GIF_SERVICE } from "../preferences";

import { APIOpt, IGif, IGifAPI, slugify } from "../models/gif";

let gf: GiphyFetch;
export async function getAPI(force?: boolean) {
  if (!gf || force) {
    gf = new GiphyFetch(await getAPIKey(GIF_SERVICE.GIPHY, force));
  }

  return gf;
}

export default async function giphy(force?: boolean) {
  const api = await getAPI(force);

  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const { offset = 0, limit } = opt || {};
      return (await api.search(term, { offset, limit })).data.map(mapGiphyResponse);
    },

    async trending(opt?: APIOpt) {
      const { offset = 0, limit = 10 } = opt || {};
      return (await api.trending({ offset, limit })).data.map(mapGiphyResponse);
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
  return <IGif>{
    id: giphyResp.id,
    title: title,
    url: giphyResp.url,
    slug: slugify(title),
    preview_gif_url: giphyResp.images.preview_gif.url,
    gif_url: giphyResp.images.fixed_height.url,
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
  };
}
