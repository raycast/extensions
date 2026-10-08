// XML Parser for Heptabase objects

/**
 * Parsed Heptabase Object
 */
export interface ParsedHeptabaseObject {
  id: string;
  type: string;
  title?: string;
  content: string;
  attributes: Record<string, string>;
  chunks: string[];
}

/**
 * Clean chunk content (remove internal XML tags like <image>)
 */
function cleanChunk(chunk: string): string {
  // Replace <image fileId="..." /> with [Image attached]
  return chunk.replace(/<image\s+fileId="[^"]+"\s*\/>/g, "📷 *[Image attached]*");
}

/**
 * Extract attributes from an XML tag string
 */
export function extractAttributes(tagString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(tagString)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

/**
 * Extract text content from <chunk> tags
 */
export function extractChunks(xmlContent: string): string[] {
  const chunkRegex = /<chunk[^>]*>([\s\S]*?)<\/chunk>/g;
  const chunks: string[] = [];
  let chunkMatch;
  while ((chunkMatch = chunkRegex.exec(xmlContent)) !== null) {
    const chunkContent = chunkMatch[1].trim();
    if (chunkContent) {
      chunks.push(chunkContent);
    }
  }
  return chunks;
}

/**
 * Parse a single Heptabase object (e.g. from get_object response)
 */
export function parseHeptabaseObject(rawText: string): ParsedHeptabaseObject | null {
  // Find the start of the object tag
  const objectMatch = rawText.match(/<(\w+)\s+id="([^"]+)"/);
  if (!objectMatch) return null;

  const type = objectMatch[1];
  const id = objectMatch[2];
  const startTagEnd = rawText.indexOf(">", objectMatch.index);

  if (startTagEnd === -1) return null;

  const fullTagString = rawText.substring(objectMatch.index!, startTagEnd + 1);
  const attributes = extractAttributes(fullTagString);
  const xmlContent = rawText.substring(objectMatch.index!); // Everything from start tag

  const chunks = extractChunks(xmlContent);

  // Format content similar to existing logic
  let content = "";

  // Special handling for highlights
  if (type === "highlightElement") {
    content = formatHighlightContent(attributes, chunks);
  } else {
    content = formatCardContent(attributes, chunks);
  }

  // Try to extract title from content if missing from attributes
  // This handles cases where get_object returns XML without title attribute but with # Title header
  let title = attributes.title;
  if (!title && content) {
    const headerMatch = content.match(/^\s*#\s+(.+)(\n|$)/);
    if (headerMatch) {
      title = headerMatch[1].trim();
    }
  }

  return {
    id,
    type,
    title,
    content,
    attributes,
    chunks,
  };
}

/**
 * Format content for standard cards
 */
function formatCardContent(attributes: Record<string, string>, chunks: string[]): string {
  let content = "";
  const title = attributes.title;
  const imageUrl = attributes.imageUrl;

  // Manual H1 title is removed based on recent changes, relying on navigationTitle
  // If we wanted to re-add it, logic would go here:
  // if (title && !chunks[0]?.startsWith(`# ${title}`)) { content += `# ${title}\n\n`; }

  if (imageUrl) {
    content += `![Image](${imageUrl})\n\n`;
  }

  if (chunks.length > 0) {
    content += chunks.map(cleanChunk).join("\n\n");
  } else {
    // Fallback for empty
    if (!title) content += "This object appears to be empty.";
  }

  return content;
}

/**
 * Format content for highlight elements
 */
function formatHighlightContent(attributes: Record<string, string>, chunks: string[]): string {
  const color = attributes.color;
  const sourceTitle = attributes.sourceTitle;

  const colorEmoji =
    color === "yellow"
      ? "🟡"
      : color === "purple"
        ? "🟣"
        : color === "green"
          ? "🟢"
          : color === "blue"
            ? "🔵"
            : color === "red"
              ? "🔴"
              : "📌";

  let content = `${colorEmoji} **Highlight**\n\n`;

  for (const chunk of chunks) {
    // Check specifically for image highlight chunks
    if (chunk.match(/<image\s+fileId="[^"]+"\s*\/>/)) {
      content += `📷 *[Image highlight]*\n\n`;
    } else if (chunk.trim()) {
      content += `> ${chunk.trim()}\n\n`;
    }
  }

  if (sourceTitle) {
    content += `---\n\n📄 **Source:** ${sourceTitle}\n`;
  }

  return content;
}

/**
 * Parse a list of objects from XML (e.g. whiteboards, journals)
 */
export function parseHeptabaseList(xmlText: string, allowedTags: string[] = []): ParsedHeptabaseObject[] {
  const objects: ParsedHeptabaseObject[] = [];

  // Generic regex to find all object tags
  // Support both <tag ...>...</tag> and <tag ... /> (self-closing)
  const tagPattern = allowedTags.length > 0 ? allowedTags.join("|") : "\\w+";
  const regex = new RegExp(
    `<(${tagPattern})\\s+id="([^"]+)"((?:(?!\\/>)[^>])*)(?:>([\\s\\S]*?)<\\/\\1>|\\s*\\/>)`,
    "g",
  );

  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const type = match[1];
    const id = match[2];
    const attributesString = match[3]; // Attributes
    const innerContent = match[4] || ""; // Undefined if self-closing

    const attributes = extractAttributes(`${type} id="${id}" ${attributesString}`);
    const chunks = extractChunks(innerContent);

    // For whiteboards/journals, content is mostly just concatenated chunks
    // We don't do full markdown formatting here usually, just raw text for previews
    // But we must clean internal XML tags
    let content = chunks.map(cleanChunk).join("\n\n");
    if (!content && innerContent.trim()) {
      // Fallback to inner content if no chunks found (and not just creating empty noise)
      // But remove XML tags
      content = innerContent.replace(/<[^>]+>/g, "").trim();
    }

    // Try to extract title from content if missing from attributes
    let title = attributes.title || attributes.name;
    if (!title && content) {
      const headerMatch = content.match(/^\s*#\s+(.+)(\n|$)/);
      if (headerMatch) {
        title = headerMatch[1].trim();
      }
    }

    objects.push({
      id,
      type,
      title,
      content,
      attributes,
      chunks,
    });
  }

  return objects;
}
