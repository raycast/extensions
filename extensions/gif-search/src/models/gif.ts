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

export function renderGifMarkdownDetails(gif: IGif) {
  let md = `
### ${gif.title}

<img alt="${gif.title}" src="${gif.gif_url}" height="200" />

\`\`\`
Static preview, animated preview coming soon!
\`\`\`
  `;

  if (gif.attribution) {
    md += `<img height="36" alt="Powered by" src="file:${environment.assetsPath}/${gif.attribution}" />`;
  }

  return md;
}
