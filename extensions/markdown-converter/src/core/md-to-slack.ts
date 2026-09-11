/**
 * Markdown to Slack mrkdwn converter.
 * Uses remark to parse Markdown into AST, then serializes to Slack's mrkdwn syntax.
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toSlack } from "./slack-stringify.js";

/**
 * Converts Markdown text to Slack mrkdwn format.
 * @param markdown - The Markdown string to convert
 * @returns Slack mrkdwn formatted text
 */
export function convertMarkdownToSlack(markdown: string): string {
  if (!markdown || typeof markdown !== "string") {
    return "";
  }

  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  return toSlack(tree);
}
