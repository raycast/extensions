import { environment } from "@raycast/api";

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
