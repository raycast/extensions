/**
 * Slack mrkdwn serializer for mdast AST.
 * Converts parsed Markdown AST to Slack's mrkdwn syntax.
 *
 * Key differences from standard Markdown:
 * - Bold: *text* (single asterisk)
 * - Italic: _text_ (underscore only)
 * - Strikethrough: ~text~ (single tilde)
 * - Links: text (url) format (API syntax <url|text> doesn't work for paste)
 * - Headers: Converted to bold (no header syntax in Slack)
 * - Tables: Wrapped in code blocks (no table syntax in Slack)
 * - Blockquote: >text (no space after >)
 */

import type { Node, Parent } from "mdast";

/**
 * Context for serialization, tracking nesting levels.
 */
interface Context {
  depth: number;
  listDepth?: number;
  ordered?: boolean;
  listIndex?: number;
}

/**
 * Converts an mdast AST to Slack mrkdwn syntax.
 * @param tree - The mdast Root node
 * @returns Slack mrkdwn formatted text
 */
export function toSlack(tree: Node): string {
  if (!("children" in tree)) {
    return "";
  }
  return serializeChildren((tree as Parent).children, { depth: 0 }).trim() + "\n";
}

/**
 * Escapes special characters for Slack mrkdwn.
 * Slack uses &, <, > as control characters.
 * @param text - Raw text to escape
 * @returns Escaped text safe for Slack
 */
function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function serializeChildren(nodes: Node[], ctx: Context): string {
  return nodes.map((n) => serializeNode(n, ctx)).join("");
}

function serializeNode(node: Node, ctx: Context): string {
  switch (node.type) {
    // Block elements
    case "heading": {
      // Slack has no header syntax - convert to bold
      const heading = node as import("mdast").Heading;
      const content = serializeChildren(heading.children, ctx);
      return `*${content}*\n\n`;
    }

    case "paragraph": {
      const para = node as import("mdast").Paragraph;
      const content = serializeChildren(para.children, ctx);
      return content + "\n\n";
    }

    case "blockquote": {
      const quote = node as import("mdast").Blockquote;
      // Slack blockquote: >text on each line (no space after >)
      const content = serializeChildren(quote.children, ctx).trim();
      const lines = content.split("\n");
      const quoted = lines.map((line) => `>${line}`).join("\n");
      return quoted + "\n\n";
    }

    case "code": {
      const code = node as import("mdast").Code;
      // Slack code blocks use triple backticks (language hint ignored)
      return "```\n" + code.value + "\n```\n\n";
    }

    case "thematicBreak":
      // Slack has no horizontal rule - use dashes
      return "---\n\n";

    // Lists
    case "list": {
      const list = node as import("mdast").List;
      const listCtx: Context = {
        ...ctx,
        listDepth: (ctx.listDepth ?? 0) + 1,
        ordered: list.ordered ?? false,
        listIndex: 0,
      };
      return serializeChildren(list.children, listCtx) + "\n";
    }

    case "listItem": {
      const item = node as import("mdast").ListItem;
      // Use Unicode bullet for unordered lists (renders nicely in Slack)
      const indent = "    ".repeat((ctx.listDepth ?? 1) - 1);
      const bullet = ctx.ordered ? `${(ctx.listIndex ?? 0) + 1}.` : "•";

      // Increment index for next sibling
      if (ctx.listIndex !== undefined) {
        ctx.listIndex++;
      }

      // Handle nested content (paragraphs, nested lists)
      let content = "";
      for (const child of item.children) {
        if (child.type === "paragraph") {
          content += serializeChildren((child as import("mdast").Paragraph).children, ctx);
        } else if (child.type === "list") {
          content += "\n" + serializeNode(child, ctx);
        } else {
          content += serializeNode(child, ctx);
        }
      }

      return `${indent}${bullet} ${content.trim()}\n`;
    }

    // Tables - wrap in code block since Slack has no table syntax
    case "table": {
      return serializeTable(node as import("mdast").Table, ctx);
    }

    case "tableRow":
    case "tableCell":
      // Handled by serializeTable
      return "";

    // Inline elements
    case "text": {
      const text = node as import("mdast").Text;
      return escapeSlack(text.value);
    }

    case "strong": {
      // Slack bold: *text*
      const strong = node as import("mdast").Strong;
      return `*${serializeChildren(strong.children, ctx)}*`;
    }

    case "emphasis": {
      // Slack italic: _text_
      const em = node as import("mdast").Emphasis;
      return `_${serializeChildren(em.children, ctx)}_`;
    }

    case "inlineCode": {
      const code = node as import("mdast").InlineCode;
      return `\`${code.value}\``;
    }

    case "delete": {
      // Slack strikethrough: ~text~
      const del = node as import("mdast").Delete;
      return `~${serializeChildren(del.children, ctx)}~`;
    }

    case "link": {
      const link = node as import("mdast").Link;
      const text = serializeChildren(link.children, ctx);
      // Slack API syntax <url|text> doesn't work for user paste
      // Output: "text (url)" or just url if text matches
      if (text && text !== link.url && !link.url.includes(text)) {
        return `${text} (${link.url})`;
      }
      // Raw URL will auto-link when pasted
      return link.url;
    }

    case "image": {
      const img = node as import("mdast").Image;
      // Slack doesn't support inline images - convert to link
      if (img.alt) {
        return `${img.alt} (${img.url})`;
      }
      return img.url;
    }

    case "break":
      return "\n";

    case "html": {
      const html = node as import("mdast").Html;
      // Strip HTML tags, keep text content
      return escapeSlack(html.value.replace(/<[^>]*>/g, ""));
    }

    case "definition":
      // Link reference definitions don't apply, skip
      return "";

    default:
      // Fallback: try to serialize children if they exist
      if ("children" in node && Array.isArray((node as Parent).children)) {
        return serializeChildren((node as Parent).children, ctx);
      }
      // Unknown leaf node
      return "";
  }
}

/**
 * Serialize a GFM table to Slack format (wrapped in code block).
 * Slack has no native table syntax, so we render as ASCII and wrap in ```.
 */
function serializeTable(node: import("mdast").Table, ctx: Context): string {
  // Calculate column widths
  const colWidths: number[] = [];
  for (const row of node.children) {
    row.children.forEach((cell, i) => {
      const content = serializeChildren(cell.children, ctx).trim();
      colWidths[i] = Math.max(colWidths[i] || 0, content.length);
    });
  }

  const rows: string[] = [];
  let isFirst = true;

  for (const row of node.children) {
    const cells = row.children.map((cell, i) => {
      const content = serializeChildren(cell.children, ctx).trim();
      return content.padEnd(colWidths[i] || 0);
    });
    rows.push("| " + cells.join(" | ") + " |");

    // Add separator after header row
    if (isFirst) {
      const separator = colWidths.map((w) => "-".repeat(w)).join(" | ");
      rows.push("| " + separator + " |");
      isFirst = false;
    }
  }

  return "```\n" + rows.join("\n") + "\n```\n\n";
}
