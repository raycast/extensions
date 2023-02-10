// Height of the list item detail window when metadata is shown
const DETAIL_WINDOW_HEIGHT = 190;

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
  attribution?: string;
}

export type APIOpt = { offset?: number; limit?: number; abort?: AbortController };

export interface IGifAPI {
  search: (term: string, opt?: APIOpt) => Promise<IGif[]>;
  trending: (opt?: APIOpt) => Promise<IGif[]>;
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
