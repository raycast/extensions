import MarkdownIt from "markdown-it";
import { safeMarkdown } from "./core.js";
import { literal } from "./interaction-format.js";

// Keep table rows as source text: table parsers discard cells beyond the header width.
// Raycast renders the sanitized pipe syntax. Reference definitions must remain visible.
const parser = new MarkdownIt("commonmark", { html: false, linkify: false }).disable("reference");

function prose(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      /^[\t |:-]+$/.test(line)
        ? line
        : safeMarkdown(line).replace(/(?:&#92;)+\|/g, (escaped) => escaped.replaceAll("&#92;", "\\")),
    )
    .join("\n");
}

/** Emit safe Markdown from parsed blocks, so code never passes through prose escaping. */
export function messageMarkdown(text: string): string {
  const tokens = parser.parse(text, {});
  // markdown-it stops consuming blocks at its nesting ceiling. Show the complete original
  // literally rather than silently lose content or recurse without a bound.
  if (tokens.some((token) => token.nesting === 1 && token.level >= parser.options.maxNesting - 1)) {
    return literal(text);
  }
  let index = 0;
  function blocks(until?: string): string {
    const output: string[] = [];
    let adjacentSetextEnd: number | undefined;
    while (index < tokens.length) {
      const token = tokens[index++]!;
      if (token.type === until) break;
      switch (token.type) {
        case "inline":
          output.push(prose(token.content));
          break;
        case "paragraph_open": {
          const content = blocks("paragraph_close");
          // A one-column pipe table can parse as setext + paragraph. Preserve their
          // adjacency so the table-aware display still sees its body rows.
          if (adjacentSetextEnd !== undefined && token.map?.[0] === adjacentSetextEnd) {
            output[output.length - 1] += "\n" + content;
          } else {
            output.push(content);
          }
          adjacentSetextEnd = undefined;
          break;
        }
        case "heading_open": {
          const content = blocks("heading_close");
          const setext = token.markup === "=" || token.markup === "-";
          // Preserve setext syntax and adjacency, including table-shaped sequences.
          const heading = setext
            ? `${content}\n${token.markup.repeat(3)}`
            : `${"#".repeat(Number(token.tag.slice(1)))} ${content.replace(/#+$/, (hashes) => "&#35;".repeat(hashes.length))}`;
          if (adjacentSetextEnd !== undefined && token.map?.[0] === adjacentSetextEnd) {
            output[output.length - 1] += "\n" + heading;
          } else {
            output.push(heading);
          }
          adjacentSetextEnd = setext ? token.map?.[1] : undefined;
          break;
        }
        case "fence":
        case "code_block":
          // The parser removes container indentation, not code indentation. Re-fence the body
          // before the enclosing list/quote prefixes are applied to every generated line.
          output.push(literal(token.content.replace(/\n$/, "")));
          break;
        case "blockquote_open":
          output.push(
            blocks("blockquote_close")
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n"),
          );
          break;
        case "bullet_list_open":
        case "ordered_list_open": {
          const ordered = token.type === "ordered_list_open";
          const items: string[] = [];
          while (
            index < tokens.length &&
            tokens[index]!.type !== (ordered ? "ordered_list_close" : "bullet_list_close")
          ) {
            const item = tokens[index++]!;
            if (item.type !== "list_item_open") continue;
            const marker = ordered ? `${item.info || token.attrGet("start") || 1}${token.markup} ` : `${token.markup} `;
            const content = blocks("list_item_close");
            const lines = content.split("\n");
            // Put children on their own line so a break or nested empty list cannot
            // combine with this marker into a top-level thematic break.
            items.push(
              marker.trimEnd() +
                (content ? "\n" + lines.map((line) => " ".repeat(marker.length) + line).join("\n") : ""),
            );
          }
          index++;
          output.push(items.join("\n\n"));
          break;
        }
        case "hr":
          output.push("---");
          break;
        default:
          if (token.content) output.push(literal(token.content));
      }
    }
    return output.join("\n\n");
  }
  return blocks();
}
