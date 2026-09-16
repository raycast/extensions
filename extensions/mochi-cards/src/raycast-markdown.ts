const HORIZONTAL_RULE_TAG = /<hr\s*\/?>/gi;
const SOFT_LINE_BREAK = /(?<!\n)\n(?!\n)/g;

export function renderRaycastMarkdown(markdown: string): string {
  return markdown.replace(HORIZONTAL_RULE_TAG, "\n\n---\n\n").replace(SOFT_LINE_BREAK, "  \n");
}
