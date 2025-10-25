// Notion block types
interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}

// Convert markdown text to Notion blocks
export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  if (!markdown || markdown.trim() === "") {
    return [];
  }

  const blocks: NotionBlock[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === "") {
      i++;
      continue;
    }

    // Headings
    if (trimmedLine.startsWith("### ")) {
      blocks.push(createHeadingBlock(3, trimmedLine.slice(4)));
      i++;
      continue;
    }
    if (trimmedLine.startsWith("## ")) {
      blocks.push(createHeadingBlock(2, trimmedLine.slice(3)));
      i++;
      continue;
    }
    if (trimmedLine.startsWith("# ")) {
      blocks.push(createHeadingBlock(1, trimmedLine.slice(2)));
      i++;
      continue;
    }

    // Bulleted list
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      blocks.push(createBulletedListBlock(trimmedLine.slice(2)));
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push(createNumberedListBlock(numberedMatch[2]));
      i++;
      continue;
    }

    // Todo/Checkbox
    if (trimmedLine.startsWith("- [ ] ") || trimmedLine.startsWith("* [ ] ")) {
      blocks.push(createTodoBlock(trimmedLine.slice(6), false));
      i++;
      continue;
    }
    if (trimmedLine.startsWith("- [x] ") || trimmedLine.startsWith("* [x] ")) {
      blocks.push(createTodoBlock(trimmedLine.slice(6), true));
      i++;
      continue;
    }

    // Code block
    if (trimmedLine.startsWith("```")) {
      const language = trimmedLine.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(createCodeBlock(codeLines.join("\n"), language));
      i++; // Skip closing ```
      continue;
    }

    // Quote
    if (trimmedLine.startsWith("> ")) {
      blocks.push(createQuoteBlock(trimmedLine.slice(2)));
      i++;
      continue;
    }

    // Divider
    if (trimmedLine === "---" || trimmedLine === "***") {
      blocks.push(createDividerBlock());
      i++;
      continue;
    }

    // Regular paragraph with inline formatting
    blocks.push(createParagraphBlock(trimmedLine));
    i++;
  }

  return blocks;
}

// Create heading block
function createHeadingBlock(level: 1 | 2 | 3, text: string): NotionBlock {
  const headingType = `heading_${level}` as "heading_1" | "heading_2" | "heading_3";
  return {
    object: "block",
    type: headingType,
    [headingType]: {
      rich_text: parseInlineFormatting(text),
    },
  };
}

// Create paragraph block with inline formatting
function createParagraphBlock(text: string): NotionBlock {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: parseInlineFormatting(text),
    },
  };
}

// Create bulleted list block
function createBulletedListBlock(text: string): NotionBlock {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: parseInlineFormatting(text),
    },
  };
}

// Create numbered list block
function createNumberedListBlock(text: string): NotionBlock {
  return {
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: parseInlineFormatting(text),
    },
  };
}

// Create todo block
function createTodoBlock(text: string, checked: boolean): NotionBlock {
  return {
    object: "block",
    type: "to_do",
    to_do: {
      rich_text: parseInlineFormatting(text),
      checked,
    },
  };
}

// Create code block
function createCodeBlock(code: string, language: string): NotionBlock {
  return {
    object: "block",
    type: "code",
    code: {
      rich_text: [
        {
          type: "text",
          text: {
            content: code,
          },
        },
      ],
      language: language || "plain text",
    },
  };
}

// Create quote block
function createQuoteBlock(text: string): NotionBlock {
  return {
    object: "block",
    type: "quote",
    quote: {
      rich_text: parseInlineFormatting(text),
    },
  };
}

// Create divider block
function createDividerBlock(): NotionBlock {
  return {
    object: "block",
    type: "divider",
    divider: {},
  };
}

interface RichText {
  type: "text";
  text: {
    content: string;
    link?: { url: string };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
}

// Parse inline formatting (bold, italic, code, links)
function parseInlineFormatting(text: string): RichText[] {
  const richText: RichText[] = [];
  let lastIndex = 0;

  // Pattern for bold, italic, code, strikethrough, and links
  const inlinePattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)|(`(.+?)`)|\[(.+?)\]\((.+?)\)/g;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        richText.push({
          type: "text",
          text: { content: beforeText },
        });
      }
    }

    // Bold
    if (match[1]) {
      richText.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true },
      });
    }
    // Italic
    else if (match[3]) {
      richText.push({
        type: "text",
        text: { content: match[4] },
        annotations: { italic: true },
      });
    }
    // Strikethrough
    else if (match[5]) {
      richText.push({
        type: "text",
        text: { content: match[6] },
        annotations: { strikethrough: true },
      });
    }
    // Code
    else if (match[7]) {
      richText.push({
        type: "text",
        text: { content: match[8] },
        annotations: { code: true },
      });
    }
    // Link
    else if (match[9]) {
      richText.push({
        type: "text",
        text: {
          content: match[9],
          link: { url: match[10] },
        },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      richText.push({
        type: "text",
        text: { content: remainingText },
      });
    }
  }

  // If no formatting found, return simple text
  if (richText.length === 0) {
    return [
      {
        type: "text",
        text: { content: text },
      },
    ];
  }

  return richText;
}
