import TurndownService from "turndown";
import type { CheerioAPI } from "cheerio";

export function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  service.addRule("codeBlocks", {
    filter: ["pre"],
    replacement: function (_content, node) {
      const codeElement = (node as Element).querySelector("code");
      const language = codeElement?.className?.match(/language-(\w+)/)?.[1] || "";
      const rawContent = (node as Element).textContent || "";
      return `\n\`\`\`${language}\n${rawContent}\n\`\`\`\n`;
    },
  });

  return service;
}

export function removeHeaderLinks($: CheerioAPI): void {
  // Remove Django's permalink/headerlink anchors (the ¶ symbols)
  $("a.headerlink").remove();
  $("a.pilcrow").remove();
}

export function stripPilcrows(text: string): string {
  return text.replace(/¶/g, "");
}

export function resolveRelativeUrls($: CheerioAPI, baseUrl: string): void {
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (href && !href.startsWith("http") && !href.startsWith("#") && !href.startsWith("mailto:")) {
      const absoluteUrl = new URL(href, baseUrl).href;
      $(element).attr("href", absoluteUrl);
    }
  });

  $("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (src && !src.startsWith("http") && !src.startsWith("data:")) {
      const absoluteUrl = new URL(src, baseUrl).href;
      $(element).attr("src", absoluteUrl);
    }
  });
}
