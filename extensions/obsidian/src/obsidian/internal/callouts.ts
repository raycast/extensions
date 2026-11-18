const CALLOUT_EMOJI_MAP: Record<string, string> = {
  // General
  note: "📝",
  abstract: "📄",
  summary: "📄",
  tldr: "📄",

  // Info
  info: "ℹ️",
  todo: "☑️",

  // Tips
  tip: "💡",
  hint: "💡",
  important: "❗",

  // Success
  success: "✅",
  check: "✅",
  done: "✅",

  // Questions
  question: "❓",
  help: "❓",
  faq: "❓",

  // Warnings
  warning: "⚠️",
  caution: "⚠️",
  attention: "⚠️",

  // Errors
  failure: "❌",
  fail: "❌",
  missing: "❌",
  danger: "⚡",
  error: "❌",
  bug: "🐛",

  // Examples & Quotes
  example: "📖",
  quote: "💬",
  cite: "💬",
};

const CALLOUT_START_PATTERN = /^>\s*\[!([^\]]+)\]\s*(.*)$/;

/**
 * Represents a parsed callout block
 */
export interface CalloutBlock {
  type: "callout";
  calloutType: string;
  title: string;
  content: string[];
  emoji: string;
}

/**
 * Represents a regular text line (not part of a callout)
 */
export interface TextBlock {
  type: "text";
  line: string;
}

export type Block = CalloutBlock | TextBlock;

/**
 * Check if a line is the start of a callout
 */
export function isCalloutStart(line: string): boolean {
  return CALLOUT_START_PATTERN.test(line);
}

/**
 * Parse a callout header line to extract type and title
 */
export function parseCalloutHeader(line: string): { type: string; title: string } | null {
  const match = line.match(CALLOUT_START_PATTERN);
  if (!match) return null;

  return {
    type: match[1].toLowerCase().trim(),
    title: match[2].trim(),
  };
}

/**
 * Remove the blockquote prefix from a line
 */
export function removeBlockquotePrefix(line: string): string {
  return line.replace(/^>\s?/, "");
}

/**
 * Parse the content into structured blocks (callouts and text)
 */
export function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isCalloutStart(line)) {
      // Parse callout header
      const header = parseCalloutHeader(line);
      if (!header) {
        // Shouldn't happen given isCalloutStart check, but be defensive
        blocks.push({ type: "text", line });
        i++;
        continue;
      }

      const emoji = CALLOUT_EMOJI_MAP[header.type] || CALLOUT_EMOJI_MAP["note"];
      const content: string[] = [];

      // Advance to next line
      i++;

      // Collect continuation lines (blockquotes that aren't new callouts)
      while (i < lines.length && lines[i].startsWith(">") && !isCalloutStart(lines[i])) {
        content.push(removeBlockquotePrefix(lines[i]));
        i++;
      }

      blocks.push({
        type: "callout",
        calloutType: header.type,
        title: header.title,
        content,
        emoji,
      });
    } else {
      blocks.push({ type: "text", line });
      i++;
    }
  }

  return blocks;
}

/**
 * Render a single callout block to markdown lines
 */
export function renderCalloutBlock(callout: CalloutBlock): string[] {
  const lines: string[] = [];

  // Header line with emoji and optional title
  const headerLine = `> ${callout.emoji}${callout.title ? ` **${callout.title}**` : ""}`;
  lines.push(headerLine);

  // Empty separator line
  lines.push(">");

  // Content lines
  for (const contentLine of callout.content) {
    if (contentLine === "") {
      lines.push(">");
    } else {
      lines.push(`> ${contentLine}`);
    }
  }

  return lines;
}

/**
 * Determine if we need spacing between two blocks
 */
function needsSpacingBefore(currentBlock: Block, previousBlock: Block | null): boolean {
  // Don't add spacing before text blocks - they manage their own spacing
  if (currentBlock.type === "text") {
    return false;
  }

  // Callout after another callout: no spacing
  if (previousBlock?.type === "callout") {
    return false;
  }

  // Callout after text or at start: add spacing
  return true;
}

function needsSpacingAfter(currentBlock: Block, nextBlock: Block | null): boolean {
  // Always add spacing after callouts, unless next block is also a callout
  if (currentBlock.type === "callout") {
    return nextBlock?.type !== "callout";
  }

  // Don't add spacing after text blocks
  return false;
}

/**
 * Render blocks to final markdown string
 */
export function renderBlocks(blocks: Block[]): string {
  const result: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = i > 0 ? blocks[i - 1] : null;
    const nextBlock = i < blocks.length - 1 ? blocks[i + 1] : null;

    // Add spacing before if needed
    if (needsSpacingBefore(block, prevBlock)) {
      result.push("");
    }

    // Render the block
    if (block.type === "callout") {
      result.push(...renderCalloutBlock(block));
    } else {
      result.push(block.line);
    }

    // Add spacing after if needed
    if (needsSpacingAfter(block, nextBlock)) {
      result.push("");
    }
  }

  return result.join("\n");
}

/**
 * Transform Obsidian callouts to rendered markdown with emojis
 *
 * This uses a two-phase approach:
 * 1. Parse: Convert raw lines into structured blocks
 * 2. Render: Convert blocks back to formatted markdown
 */
export function renderCallouts(content: string): string {
  const lines = content.split("\n");
  const blocks = parseBlocks(lines);
  return renderBlocks(blocks);
}
