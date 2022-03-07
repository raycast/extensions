import path from "path";

import type { IGif as GiphyGif } from "@giphy/js-types";
import type { TenorGif } from "./tenor";

export interface IGif {
  id: string | number;
  title: string;
  url: string;
  slug: string;
  preview_gif_url: string;
  gif_url: string;
}

export function mapGiphyResponse(giphyResp: GiphyGif) {
  return <IGif>{
    id: giphyResp.id,
    title: giphyResp.title,
    url: giphyResp.url,
    slug: giphyResp.slug,
    preview_gif_url: giphyResp.images.preview_gif.url,
    gif_url: giphyResp.images.downsized.url,
  };
}

export function mapTenorResponse(tenorResp: TenorGif) {
  const mediaItem = tenorResp.media[0];
  return <IGif>{
    id: tenorResp.id,
    title: tenorResp.title || tenorResp.h1_title || tenorResp.content_description,
    url: tenorResp.itemurl,
    slug: path.basename(tenorResp.itemurl),
    preview_gif_url: mediaItem.tinygif.url,
    gif_url: mediaItem.gif.url,
  };
}
