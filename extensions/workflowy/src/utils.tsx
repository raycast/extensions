import { convert } from "html-to-text";
import TurndownService from "turndown";
import { WorkflowyNode } from "./types";

const turdownService = new TurndownService();

export function nodetoText(node: WorkflowyNode) {
  return convert(node.nm, { selectors: [{ selector: "a", options: { hideLinkHrefIfSameAsText: true } }] });
}

export function getMardown(node: WorkflowyNode) {
  const lines = ["### " + turdownService.turndown(node.nm)];

  if (node.no) {
    lines.push(codeblock(node.no));
  }
  return lines.join("\n");
}

export function codeblock(code: string) {
  return `\`\`\`
${code}
\`\`\``;
}
