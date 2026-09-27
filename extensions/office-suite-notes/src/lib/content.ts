import TurndownService from "turndown";
const converter = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
converter.remove(["script", "style", "iframe", "object"]);
// Do not fetch note-controlled images (tracking URLs, private network URLs, or file URLs).
converter.addRule("no-images", { filter: "img", replacement: () => "[Image omitted]" });
converter.addRule("safe-links", { filter: "a", replacement: (content) => content });
export function preview(content: string): string {
  const text = /<\/?(?:p|div|br|h[1-6]|ul|ol|li|span|table|img|a|script|iframe)\b/i.test(content)
    ? converter.turndown(content)
    : content;
  // Conservative Markdown preview: suppress all image/link destinations, including reference syntax.
  return text
    .replace(/!\[[^\]\n]*\]\([^\n]*?\)/g, "[Image omitted]")
    .replace(/!\[[^\]\n]*\](?:\[[^\]\n]*\])?/g, "[Image omitted]")
    .replace(/\[([^\]\n]*)\]\([^\n]*?\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/^ {0,3}\[[^\]]+\]:.*$/gm, "");
}
