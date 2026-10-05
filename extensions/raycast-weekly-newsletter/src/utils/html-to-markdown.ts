import { NodeHtmlMarkdown } from "node-html-markdown";

const nhm = new NodeHtmlMarkdown({
  bulletMarker: "*",
  codeBlockStyle: "fenced",
  strongDelimiter: "**",
});

export function htmlToMarkdown(html: string): string {
  return nhm.translate(html);
}
