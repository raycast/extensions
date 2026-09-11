/**
 * Quill Delta to Markdown converter
 * Based on https://github.com/frysztak/quill-delta-to-markdown
 */

// Quill Delta types
export interface DeltaAttributes {
  // Inline formats
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  link?: string;
  code?: boolean;
  script?: "sub" | "super";
  // Block formats
  header?: 1 | 2 | 3 | 4 | 5 | 6;
  list?: "ordered" | "bullet" | "checked" | "unchecked";
  blockquote?: boolean;
  "code-block"?: boolean | string;
  indent?: number;
  align?: "center" | "right" | "justify";
  direction?: "rtl";
  // Other
  color?: string;
  background?: string;
  font?: string;
  size?: string;
}

export interface DeltaOp {
  insert?: string | { image?: string; video?: string; thematic_break?: boolean; [key: string]: unknown };
  attributes?: DeltaAttributes;
  delete?: number;
  retain?: number;
}

export type Delta = DeltaOp[];

// URL encoding helper
function encodeLink(link: string): string {
  return encodeURI(link)
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/(\?|&)response-content-disposition=attachment.*$/, "");
}

// Apply inline formatting to text
function applyInlineFormat(text: string, attrs: DeltaAttributes): string {
  if (!attrs) return text;

  // Apply code first (innermost)
  if (attrs.code) {
    text = `\`${text}\``;
  }

  // Apply bold
  if (attrs.bold) {
    text = `**${text}**`;
  }

  // Apply italic
  if (attrs.italic) {
    text = `_${text}_`;
  }

  // Apply strikethrough
  if (attrs.strike) {
    text = `~~${text}~~`;
  }

  // Apply underline (using HTML since markdown doesn't support it)
  if (attrs.underline) {
    text = `<u>${text}</u>`;
  }

  // Apply subscript/superscript
  if (attrs.script === "super") {
    text = `<sup>${text}</sup>`;
  } else if (attrs.script === "sub") {
    text = `<sub>${text}</sub>`;
  }

  // Apply link (outermost)
  if (attrs.link) {
    text = `[${text}](${encodeLink(attrs.link)})`;
  }

  return text;
}

// Handle embed types
function handleEmbed(embed: Record<string, unknown>): string {
  if (embed.image && typeof embed.image === "string") {
    return `![](${encodeLink(embed.image)})`;
  }
  if (embed.video && typeof embed.video === "string") {
    return `[Video](${encodeLink(embed.video)})`;
  }
  if (embed.thematic_break) {
    return "\n---\n";
  }
  return "";
}

interface LineBuffer {
  text: string;
  blockAttr?: DeltaAttributes;
}

/**
 * Convert Quill Delta format to Markdown
 * @param ops - Delta operations array or JSON string
 * @returns Markdown string
 */
export function deltaToMarkdown(ops: DeltaOp[] | string): string {
  try {
    const deltaOps: DeltaOp[] = typeof ops === "string" ? JSON.parse(ops) : ops;

    if (!Array.isArray(deltaOps)) {
      return typeof ops === "string" ? ops : "";
    }

    const lines: LineBuffer[] = [];
    let currentLine: LineBuffer = { text: "" };
    let listCounters: number[] = [0]; // Stack for nested list counters

    for (let i = 0; i < deltaOps.length; i++) {
      const op = deltaOps[i];

      // Handle embeds
      if (typeof op.insert === "object" && op.insert !== null) {
        currentLine.text += handleEmbed(op.insert);
        continue;
      }

      if (typeof op.insert !== "string") continue;

      const text = op.insert;
      const attrs = op.attributes || {};

      // Check if this is a block-level format marker (newline with block attributes)
      if (text === "\n" && hasBlockAttribute(attrs)) {
        // Apply block formatting to current line
        currentLine.blockAttr = attrs;
        lines.push(currentLine);
        currentLine = { text: "" };
        continue;
      }

      // Split by newlines and process each part
      const parts = text.split("\n");

      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];

        if (part) {
          // Apply inline formatting
          currentLine.text += applyInlineFormat(part, attrs);
        }

        // If not the last part, we have a newline
        if (j < parts.length - 1) {
          lines.push(currentLine);
          currentLine = { text: "" };
        }
      }
    }

    // Push any remaining content
    if (currentLine.text) {
      lines.push(currentLine);
    }

    // Convert lines to markdown
    let markdown = "";
    let inCodeBlock = false;
    let prevListType: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const attrs = line.blockAttr || {};
      const lineText = line.text;

      // Handle code blocks
      if (attrs["code-block"]) {
        if (!inCodeBlock) {
          markdown += "```\n";
          inCodeBlock = true;
        }
        markdown += lineText + "\n";

        // Check if next line is not a code block
        const nextAttrs = lines[i + 1]?.blockAttr;
        if (!nextAttrs?.["code-block"]) {
          markdown += "```\n";
          inCodeBlock = false;
        }
        continue;
      }

      // Close code block if we were in one
      if (inCodeBlock) {
        markdown += "```\n";
        inCodeBlock = false;
      }

      // Handle headers
      if (attrs.header) {
        markdown += "#".repeat(attrs.header) + " " + lineText + "\n";
        prevListType = null;
        listCounters = [0];
        continue;
      }

      // Handle blockquotes
      if (attrs.blockquote) {
        markdown += "> " + lineText + "\n";
        prevListType = null;
        listCounters = [0];
        continue;
      }

      // Handle lists
      if (attrs.list) {
        const indent = attrs.indent || 0;
        const indentStr = "  ".repeat(indent);

        // Reset counter if list type changed or we're at a different indent level
        if (prevListType !== attrs.list || listCounters.length <= indent) {
          while (listCounters.length <= indent) {
            listCounters.push(0);
          }
        }

        // Trim counters if indent decreased
        while (listCounters.length > indent + 1) {
          listCounters.pop();
        }

        if (attrs.list === "ordered") {
          listCounters[indent]++;
          markdown += indentStr + listCounters[indent] + ". " + lineText + "\n";
        } else if (attrs.list === "bullet") {
          markdown += indentStr + "- " + lineText + "\n";
        } else if (attrs.list === "checked") {
          markdown += indentStr + "- [x] " + lineText + "\n";
        } else if (attrs.list === "unchecked") {
          markdown += indentStr + "- [ ] " + lineText + "\n";
        }

        prevListType = attrs.list;
        continue;
      }

      // Regular paragraph
      if (prevListType) {
        // Add extra newline after list
        markdown += "\n";
        prevListType = null;
        listCounters = [0];
      }

      // Use two trailing spaces for line breaks in Markdown
      // or use blank line for paragraph separation
      if (lineText) {
        markdown += lineText + "  \n"; // Two spaces for soft line break
      } else {
        markdown += "\n"; // Empty line for paragraph break
      }
    }

    // Close any remaining code block
    if (inCodeBlock) {
      markdown += "```\n";
    }

    return markdown.trimEnd() + "\n";
  } catch {
    // If parsing fails, return the original string
    return typeof ops === "string" ? ops : "";
  }
}

// Check if attributes contain block-level formatting
function hasBlockAttribute(attrs: DeltaAttributes): boolean {
  return Boolean(attrs.header || attrs.list || attrs.blockquote || attrs["code-block"]);
}

/**
 * Try to parse note content - could be delta JSON or plain text
 * @param note - Note content (could be delta JSON or plain text)
 * @returns Markdown or plain text
 */
export function parseNoteContent(note: string | undefined): string {
  if (!note) return "";

  // Check if it looks like JSON (delta format)
  const trimmed = note.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const result = deltaToMarkdown(trimmed);
    // Remove trailing newline for display
    return result.trimEnd();
  }

  // Plain text
  return note;
}
