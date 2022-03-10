import path from "path";

import type { IGif as GiphyGif } from "@giphy/js-types";
import { environment } from "@raycast/api";

import type { TenorGif } from "./tenor";
import { FinerGif } from "./finerthingsclub";

export interface IGif {
  id: string | number;
  title: string;
  url?: string;
  slug: string;
  preview_gif_url: string;
  gif_url: string;
  attribution?:
    | {
        dark: string;
        light: string;
      }
    | string;
}

export function mapGiphyResponse(giphyResp: GiphyGif) {
  return <IGif>{
    id: giphyResp.id,
    title: giphyResp.title,
    url: giphyResp.url,
    slug: giphyResp.slug,
    preview_gif_url: giphyResp.images.preview_gif.url,
    gif_url: giphyResp.images.fixed_height.url,
    attribution: "poweredby_giphy.png",
  };
}

export function mapTenorResponse(tenorResp: TenorGif) {
  const mediaItem = tenorResp.media[0];
  return <IGif>{
    id: tenorResp.id,
    title: tenorResp.title || tenorResp.h1_title || tenorResp.content_description,
    url: tenorResp.itemurl,
    slug: path.basename(tenorResp.itemurl),
    preview_gif_url: mediaItem.tinygif.preview,
    gif_url: mediaItem.tinygif.url,
    attribution: "poweredby_tenor.png",
  };
}

export function mapFinerGifsResponse(finerGifsResp: FinerGif) {
  const gifUrl = new URL(finerGifsResp.fields.fileid + ".gif", "https://media.thefinergifs.club");
  return <IGif>{
    id: finerGifsResp.id,
    title: finerGifsResp.fields.text,
    slug: finerGifsResp.fields.fileid,
    preview_gif_url: gifUrl.toString(),
    gif_url: gifUrl.toString(),
  };
}

export function renderGifMarkdownDetails(gif: IGif) {
  let md = `
  ## ${gif.title}

  ![${gif.title}](${gif.gif_url})

  \`\`\`
  Static preview, animated preview coming soon!
  \`\`\`
  `;

  if (gif.attribution) {
    md += `
    ![Powered by](file:${environment.assetsPath}/${gif.attribution})
    `;
  }

  return md;
}
