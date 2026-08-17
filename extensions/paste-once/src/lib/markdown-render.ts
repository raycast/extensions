import { marked } from "marked";
import { MarkdownReformatter } from "./markdown-reformatter";

marked.setOptions({ gfm: true, breaks: false });

export function prepareMarkdown(source: string): string {
  if (MarkdownReformatter.isLikelyMarkdown(source)) {
    return MarkdownReformatter.reformat(source);
  }
  return source;
}

export function markdownToHtml(source: string): string {
  return marked.parse(source, { async: false }) as string;
}

export function markdownToPlain(source: string): string {
  let text = source.replace(/\r\n/g, "\n");
  text = text.replace(/```[\w+-]*\n?([\s\S]*?)```/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, "• ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return text.replace(/[ \t]+\n/g, "\n").trim();
}

export function renderMarkdown(source: string): { html: string; text: string; prepared: string } {
  const prepared = prepareMarkdown(source);
  return {
    prepared,
    html: markdownToHtml(prepared),
    text: markdownToPlain(prepared),
  };
}
