import type { NodeHtmlMarkdown } from "node-html-markdown";

let nhm: NodeHtmlMarkdown;

export async function htmlToMarkdown(html: string) {
  if (!nhm) {
    const { NodeHtmlMarkdown } = await import("node-html-markdown");
    nhm = new NodeHtmlMarkdown();
  }

  return nhm.translate(html);
}
