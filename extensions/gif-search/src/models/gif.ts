import { environment } from "@raycast/api";

export interface IGif {
  id: string | number;
  title: string;
  url?: string;
  slug: string;
  preview_gif_url: string;
  gif_url: string;
  metadata?: {
    width?: number;
    height?: number;
    size?: number;
    labels?: {
      title: string;
      text: string;
    }[];
    links?: {
      title: string;
      target: string;
      text: string;
    }[];
    tags?: string[];
  };
  attribution?:
    | {
        dark: string;
        light: string;
      }
    | string;
}

export type APIOpt = { offset?: number; limit?: number; abort?: AbortController };

export interface IGifAPI {
  search: (term: string, opt?: APIOpt) => Promise<IGif[]>;
  trending: (opt?: APIOpt) => Promise<IGif[]>;
  gifs: (id: string[]) => Promise<IGif[]>;
}

export function renderGifMarkdownDetails(gif: IGif) {
  let md = `
### ${gif.title}

<img alt="${gif.title}" src="${gif.gif_url}" height="200" />

  `;

  if (gif.attribution) {
    md += `<img height="36" alt="Powered by" src="file:${environment.assetsPath}/${gif.attribution}" />`;
  }

  return md;
}
