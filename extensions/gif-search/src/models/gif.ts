import type { IGif as GiphyGif } from "@giphy/js-types";
// Height of the list item detail window when metadata is shown
const DETAIL_WINDOW_HEIGHT = 190;

export interface IGif {
  id: string;
  title: string;
  url?: string;
  slug: string;
  download_url: string;
  download_name: string;
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
  attribution?: string;
  video?: GiphyGif["video"];
}

export type APIOpt = { offset?: number; limit?: number; next?: string };

export interface IGifAPI {
  search: (term: string, opt?: APIOpt) => Promise<{ results: IGif[]; next?: string }>;
  trending: (opt?: APIOpt) => Promise<{ results: IGif[]; next?: string }>;
  gifs: (id: string[]) => Promise<IGif[]>;
}

export function renderGifMarkdownDetails(gif: IGif, limitHeight?: boolean) {
  const height = limitHeight ? DETAIL_WINDOW_HEIGHT : "";
  return `<img alt="${gif.title}" src="${gif.gif_url}" height="${height}" />`;
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
