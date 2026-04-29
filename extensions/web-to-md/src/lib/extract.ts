import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { fetchText } from "./fetch";
import { absolutizeDomLinksAndImages } from "./html";

export type ExtractedArticle = {
  title?: string;
  author?: string;
  excerpt?: string;
  sourceUrl: string;
  bodyMarkdown: string;
};

export async function extractArticleMarkdown(
  url: string,
): Promise<ExtractedArticle | null> {
  const html = await fetchText(url);
  return extractArticleMarkdownFromHtml(html, url);
}

export function extractArticleMarkdownFromHtml(
  html: string,
  url: string,
): ExtractedArticle | null {
  const { document } = parseHTML(html);

  absolutizeDomLinksAndImages(document as unknown as Document, url);

  const reader = new Readability(document as unknown as Document);
  const article = reader.parse();
  if (!article?.content) return null;

  const turndown = createTurndown();
  const bodyMarkdown = turndown.turndown(article.content);

  return {
    title: article.title || undefined,
    author: article.byline || undefined,
    excerpt: article.excerpt || undefined,
    sourceUrl: url,
    bodyMarkdown,
  };
}

export async function extractFallbackMarkdown(
  url: string,
  prefix: string,
): Promise<ExtractedArticle | null> {
  const fallbackUrl = `${prefix}${url}`;
  const text = await fetchText(fallbackUrl);

  // Treat response as markdown-ish plain text (depends on the service).
  const bodyMarkdown = text.trim();
  if (!bodyMarkdown) return null;

  return {
    sourceUrl: url,
    bodyMarkdown,
  };
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
  });

  service.use(gfm);

  // Keep <pre><code> blocks as fenced blocks even when nested markup exists.
  service.addRule("fencedCodeBlocks", {
    filter: (node: HTMLElement) => {
      return (
        node.nodeName === "PRE" &&
        Boolean(
          node.firstChild && (node.firstChild as Element).nodeName === "CODE",
        )
      );
    },
    replacement: (_content: string, node: HTMLElement) => {
      const codeNode = node.firstChild as Element | null;
      const code = (codeNode?.textContent ?? "").replace(/\n$/, "");
      return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    },
  });

  return service;
}
