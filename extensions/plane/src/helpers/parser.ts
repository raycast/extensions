import { marked } from "marked";
import TurndownService from "turndown";

export const getTurndownService = () => {
  return new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "*" });
};

export const parseMarkdownToHtml = async (markdown: string) => {
  return await marked.parse(markdown);
};

export const parseHtmlToMarkdown = (html: string) => {
  const turndownService = getTurndownService();
  return turndownService.turndown(html);
};
