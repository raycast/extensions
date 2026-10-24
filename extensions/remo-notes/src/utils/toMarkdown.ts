import TurndownService from "turndown";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

export function toMarkdown(html: string): string {
  if (!html) return "";
  return turndownService.turndown(html);
}
