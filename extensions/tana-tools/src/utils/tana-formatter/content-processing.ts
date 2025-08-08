/**
 * Content processing utilities for different content types
 * Handles the specific processing needed for each format
 */
import { chunkTranscript, TranscriptChunk } from "./transcript-chunking";

/**
 * Represents a hierarchical content node
 */
/**
 * Represents a node in the hierarchical content structure
 *
 * @interface ContentNode
 * @property {'heading' | 'content'} type - Whether this node is a heading or content
 * @property {number} [level] - Heading level (1-6) for heading nodes
 * @property {string} text - The text content of this node
 * @property {ContentNode[]} children - Child nodes nested under this node
 */
interface ContentNode {
  type: "heading" | "content";
  level?: number; // For headings (1-6)
  text: string;
  children: ContentNode[];
}

/**
 * Represents a content section between headings
 *
 * @interface ContentSection
 * @property {Object} [heading] - Optional heading information for this section
 * @property {number} heading.level - Heading level (1-6)
 * @property {string} heading.text - Heading text content
 * @property {string[]} content - Array of content lines in this section
 */
interface ContentSection {
  heading?: {
    level: number;
    text: string;
  };
  content: string[];
}

/**
 * Parse markdown content into hierarchical structure with headings and nested content
 *
 * Analyzes markdown text and creates a hierarchical structure where headings
 * become parent nodes and content becomes children, preserving the document structure.
 *
 * @param content - The markdown content to parse
 * @returns Array of ContentNode objects representing the hierarchical structure
 */
export function parseMarkdownStructure(content: string): ContentNode[] {
  if (!content) return [];

  const lines = content.split("\n");
  const sections: ContentSection[] = [];
  let currentSection: ContentSection = { content: [] };

  // Parse lines into sections
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for heading
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      // Save current section if it has content
      if (currentSection.heading || currentSection.content.length > 0) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        heading: {
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
        },
        content: [],
      };
    } else {
      // Add content to current section
      currentSection.content.push(line);
    }
  }

  // Add final section
  if (currentSection.heading || currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  // Build hierarchical structure
  return buildHierarchy(sections);
}

/**
 * Build hierarchical node structure from flat sections
 *
 * Takes flat content sections and builds a proper hierarchy based on heading levels,
 * ensuring child nodes are properly nested under their parent headings.
 *
 * @param sections - Array of content sections to organize hierarchically
 * @returns Array of ContentNode objects with proper parent-child relationships
 */
function buildHierarchy(sections: ContentSection[]): ContentNode[] {
  const result: ContentNode[] = [];
  const stack: ContentNode[] = [];

  for (const section of sections) {
    // Create content nodes for this section's content
    const contentNodes: ContentNode[] = section.content
      .filter((line) => line.trim().length > 0)
      .map((line) => ({
        type: "content" as const,
        text: line,
        children: [],
      }));

    if (section.heading) {
      // Create heading node
      const headingNode: ContentNode = {
        type: "heading",
        level: section.heading.level,
        text: section.heading.text,
        children: contentNodes,
      };

      // Find correct parent in stack based on heading level
      while (
        stack.length > 0 &&
        stack[stack.length - 1].level! >= section.heading.level
      ) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level heading
        result.push(headingNode);
      } else {
        // Nested heading
        stack[stack.length - 1].children.push(headingNode);
      }

      stack.push(headingNode);
    } else {
      // Content without heading - add to current level or top level
      if (stack.length === 0) {
        result.push(...contentNodes);
      } else {
        stack[stack.length - 1].children.push(...contentNodes);
      }
    }
  }

  return result;
}

/**
 * Convert markdown text formatting to Tana format
 *
 * Transforms markdown syntax to Tana-compatible formatting, including
 * italic markers, highlights, blockquotes, images, and list structures.
 *
 * @param text - Markdown text to convert
 * @returns Text formatted for Tana with proper syntax
 */
export function convertMarkdownToTana(text: string): string {
  if (!text) return "";

  let result = text;

  // Convert italic: *text* (single asterisk, not bold) or _text_ to __text__ (Tana italic format)
  // Handle single asterisks for italic (but not double asterisks for bold)
  // Match single asterisk that's not preceded or followed by another asterisk
  result = result.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1__$2__");
  // Handle underscore italic (single underscores, not double)
  // Match single underscore that's not preceded or followed by another underscore
  result = result.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1__$2__");

  // Convert highlight: ==text== to ^^text^^ (Tana highlight format)
  result = result.replace(/==([^=\n]+)==/g, "^^$1^^");

  // Convert blockquotes: > text to indented format
  result = result.replace(/^>\s*(.+)$/gm, "  - $1");

  // Convert images: ![alt](url) to ![](url) (simplify alt text for Tana)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "![]($2)");

  // Convert markdown lists to proper Tana bullet format
  result = convertMarkdownLists(result);

  // Preserve bold (**text**), links ([text](url)), and code (`code`) as-is
  // These are already in Tana-compatible format

  return result;
}

/**
 * Convert markdown and various list formats to Tana bullet format
 *
 * Handles multiple list formats including markdown bullets, Unicode bullets,
 * numbered lists, lettered lists, and Roman numerals, converting all to
 * consistent Tana bullet format while preserving indentation.
 *
 * @param text - Text containing various list formats
 * @returns Text with all lists converted to Tana bullet format
 */
function convertMarkdownLists(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Enhanced list detection for various formats
    // Standard markdown bullets: - * + (with one or more spaces)
    const markdownMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    // Unicode bullets commonly used by browsers: • ‣ ▸ ▪ ▫ ▬ ◦ (with one or more spaces)
    const unicodeBulletMatch = trimmed.match(/^[•‣▸▪▫▬◦]\s+(.+)$/);
    // Standalone bullet characters (just the bullet, content on next line)
    const standaloneBulletMatch = trimmed.match(/^[•‣▸▪▫▬◦]$/);
    // Numbered lists: 1. 2. etc. (with one or more spaces)
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    // Lettered lists: a. b. etc. (with one or more spaces)
    const letteredMatch = trimmed.match(/^[a-z]\.\s+(.+)$/);
    // Roman numerals: i. ii. iii. etc. (with one or more spaces)
    const romanMatch = trimmed.match(/^[ivx]+\.\s+(.+)$/i);

    if (markdownMatch) {
      // Convert markdown list items
      const indent = line.match(/^(\s*)/)?.[1] || "";
      result.push(`${indent}- ${markdownMatch[1]}`);
    } else if (unicodeBulletMatch) {
      // Convert Unicode bullet list items
      const indent = line.match(/^(\s*)/)?.[1] || "";
      result.push(`${indent}- ${unicodeBulletMatch[1]}`);
    } else if (standaloneBulletMatch) {
      // Skip standalone bullet characters (they're just separators)
    } else if (numberedMatch) {
      // Convert numbered list items to bullets
      const indent = line.match(/^(\s*)/)?.[1] || "";
      result.push(`${indent}- ${numberedMatch[1]}`);
    } else if (letteredMatch) {
      // Convert lettered list items to bullets
      const indent = line.match(/^(\s*)/)?.[1] || "";
      result.push(`${indent}- ${letteredMatch[1]}`);
    } else if (romanMatch) {
      // Convert roman numeral list items to bullets
      const indent = line.match(/^(\s*)/)?.[1] || "";
      result.push(`${indent}- ${romanMatch[1]}`);
    } else {
      // Preserve non-list lines as-is
      result.push(line);
    }
  }

  return result.join("\n");
}

/**
 * Convert hierarchical content nodes to Tana format
 *
 * Recursively converts ContentNode objects to Tana bullet format,
 * handling headings as parent nodes and maintaining proper indentation.
 *
 * @param nodes - Array of ContentNode objects to convert
 * @param depth - Current indentation depth (default: 0)
 * @returns Array of formatted Tana lines
 */
export function convertNodesToTana(
  nodes: ContentNode[],
  depth: number = 0,
): string[] {
  const result: string[] = [];
  const indent = "  ".repeat(depth);

  for (const node of nodes) {
    if (node.type === "heading") {
      // Convert heading to Tana format
      result.push(`${indent}- !! ${convertMarkdownToTana(node.text)}`);

      // Add children with increased indentation
      if (node.children.length > 0) {
        result.push(...convertNodesToTana(node.children, depth + 1));
      }
    } else {
      // Process content line
      const processedText = convertMarkdownToTana(node.text);

      // Handle multi-line content (like lists) by processing each line
      const lines = processedText.split("\n");
      for (const line of lines) {
        const cleanedText = line.trim();

        // Skip empty lines and empty bullet nodes
        if (!cleanedText || isEmptyBulletNode(cleanedText)) {
          continue;
        }

        // Preserve original indentation from markdown
        const originalIndent = line.match(/^(\s*)/)?.[1] || "";

        if (cleanedText.startsWith("- ")) {
          // Already a bullet - preserve original indentation relative to base
          result.push(`${indent}${originalIndent}${cleanedText}`);
        } else {
          // Make it a bullet with original indentation
          result.push(`${indent}${originalIndent}- ${cleanedText}`);
        }
      }
    }
  }

  return result;
}

/**
 * Check if a line is an empty bullet node
 *
 * Detects various forms of empty bullet points including standard bullets,
 * Unicode bullets, and lines with only invisible characters.
 *
 * @param line - Text line to check
 * @returns True if the line is an empty bullet node
 */
function isEmptyBulletNode(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === "-" ||
    trimmed === "•" ||
    trimmed === "*" ||
    trimmed === "- •" ||
    trimmed === "- *" ||
    trimmed === "-•" ||
    trimmed === "-*" ||
    /^-\s*[•*\u200B\u200C\u200E\u200F\u2028\u2029\uFEFF]*(\u200D)*\s*$/u.test(
      trimmed,
    ) ||
    /^[-\s\u200B\u200C\u200E\u200F\u2028\u2029\uFEFF]*(\u200D)*$/u.test(trimmed)
  );
}

/**
 * Process a Limitless Pendant transcription into a clean single-line format
 *
 * Converts Limitless Pendant format transcripts into clean, single-line format
 * by extracting speaker names and content while removing timestamps and metadata.
 * Format: > [Speaker](#startMs=timestamp&endMs=timestamp): Content
 *
 * @param text - Raw Limitless Pendant transcript text
 * @returns Cleaned transcript in format "Speaker: Content Speaker: Content"
 */
export function processLimitlessPendantTranscript(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")) // Remove headers and empty lines
    .filter((line) => line.startsWith(">")) // Keep only pendant format lines
    .map((line) => {
      // Extract speaker and content from pendant format
      const match = line.match(
        /^>\s*\[(.*?)\]\(#startMs=(\d+)&endMs=\d+\):\s*(.*?)$/,
      );
      if (!match) return line;
      const [, speaker, , content] = match;
      return `${speaker}: ${content}`;
    })
    .filter((processedContent) => processedContent !== "")
    .join(" ");
}

/**
 * Process a Limitless App transcription into a clean single-line format
 *
 * Converts Limitless App format transcripts into clean, single-line format
 * by grouping content by speaker and removing timestamps and formatting.
 * Format: Speaker Name, empty line, timestamp, content
 *
 * @param text - Raw Limitless App transcript text
 * @returns Cleaned transcript in format "Speaker: Content Speaker: Content"
 */
export function processLimitlessAppTranscript(text: string): string {
  const lines = text.split("\n");
  const combinedContent: string[] = [];
  let currentSpeaker = "";
  let contentParts: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this is a speaker line (followed by empty line)
    if (i < lines.length - 1 && !lines[i + 1].trim()) {
      if (currentSpeaker && contentParts.length > 0) {
        combinedContent.push(`${currentSpeaker}: ${contentParts.join(" ")}`);
        contentParts = [];
      }
      currentSpeaker = line;
      continue;
    }

    // Skip timestamp lines
    if (
      line.match(
        /(Yesterday|Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}:\d{2}\s+(AM|PM)/,
      )
    ) {
      continue;
    }

    contentParts.push(line);
  }

  if (currentSpeaker && contentParts.length > 0) {
    combinedContent.push(`${currentSpeaker}: ${contentParts.join(" ")}`);
  }

  return combinedContent.join(" ");
}

/**
 * Process YouTube transcript content
 *
 * Extracts and cleans transcript content from YouTube-formatted text,
 * removing hashtags and formatting while preserving the actual transcript content.
 *
 * @param text - Text containing YouTube transcript data
 * @returns Cleaned transcript text suitable for Tana
 */
export function processYouTubeTranscript(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // Find the transcript start index
  const transcriptStartIndex = lines.findIndex((line) =>
    line.match(/\bTranscript:(?::|\s)/i),
  );

  if (transcriptStartIndex === -1) {
    return ""; // No transcript found
  }

  // Find the end of transcript (next field marker after transcript start)
  const transcriptEndIndex = lines.findIndex(
    (line, index) => index > transcriptStartIndex && line.match(/^[^:]+::/),
  );

  // Extract transcript lines (from start to end or to the end of array)
  const transcriptLines = lines.slice(
    transcriptStartIndex,
    transcriptEndIndex === -1 ? undefined : transcriptEndIndex,
  );

  // Process transcript lines
  return transcriptLines
    .map((line, index) => {
      if (index === 0) {
        // First line: extract content after "Transcript:" label
        const transcriptPart = line
          .replace(/^.*?\bTranscript:(?::|\s)/, "")
          .trim();
        return transcriptPart.replace(/#\w+\b/g, "").trim();
      } else {
        // Other lines: clean hashtags
        return line.replace(/#\w+\b/g, "").trim();
      }
    })
    .filter((line) => line) // Remove empty lines
    .join(" ");
}

/**
 * Process and chunk any transcript content
 *
 * Takes any transcript content and chunks it into manageable sizes
 * with proper boundary detection for optimal Tana formatting.
 *
 * @param content - Transcript content to process and chunk
 * @param maxChunkSize - Maximum size for each chunk (default: 7000)
 * @returns Array of TranscriptChunk objects
 */
export function processAndChunkTranscript(
  content: string,
  maxChunkSize: number = 7000,
): TranscriptChunk[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  return chunkTranscript(content, maxChunkSize);
}

/**
 * Clean and escape content for Tana formatting with enhanced markdown processing
 *
 * Processes content for Tana compatibility by handling markdown structures,
 * escaping problematic characters, and converting formatting appropriately.
 * Uses hierarchical processing for content with headings.
 *
 * @param content - Raw content to clean and format
 * @returns Content cleaned and formatted for Tana
 */
export function cleanContentForTana(content: string): string {
  if (!content) return "";

  // Check if content has markdown headings - if so, use hierarchical processing
  const hasHeadings = /^#{1,6}\s+.+$/m.test(content);

  if (hasHeadings) {
    // Use hierarchical markdown processing
    const nodes = parseMarkdownStructure(content);
    const tanaLines = convertNodesToTana(nodes);
    // Escape # in content (but headings are already converted to !! format)
    const escapedLines = tanaLines.map((line) => line.replace(/#/g, "\\#"));
    return escapedLines.join("\n");
  } else {
    // Use simple line-by-line processing for content without headings
    return content
      .split("\n")
      .map((line) => {
        const processedLine = convertMarkdownToTana(line);
        const trimmedLine = processedLine.trim();

        // Skip empty bullet-only lines and lines with only invisible characters
        const cleaned = trimmedLine.replace(
          /[\s\u200B\u200C\u200E\u200F\u2028\u2029\uFEFF]|\u200D/gu,
          "",
        );
        if (cleaned.length === 0) {
          return "";
        }

        if (isEmptyBulletNode(trimmedLine)) {
          return "";
        }

        // Escape # symbols to prevent unwanted tag creation (but not in headings)
        return trimmedLine.replace(/#/g, "\\#");
      })
      .filter((line) => line.trim().length > 0) // Remove empty lines after processing
      .join("\n");
  }
}

/**
 * Legacy function for simple header conversion (kept for backward compatibility)
 *
 * Converts markdown headers to Tana headings and escapes hash symbols.
 * Provided for backward compatibility with older formatting approaches.
 *
 * @param content - Content with markdown headers
 * @returns Content with headers converted to Tana format
 */
export function convertSimpleHeaders(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmedLine = line.trim();

      // Convert markdown headers to Tana headings and escape # symbols
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const text = headerMatch[2];
        return `!! ${text}`;
      } else {
        // Escape # symbols to prevent unwanted tag creation
        return trimmedLine.replace(/#/g, "\\#");
      }
    })
    .join("\n");
}

/**
 * Remove colons from content to prevent accidental field creation
 *
 * Removes double colons (::) from content to prevent unintended
 * Tana field creation while preserving single colons.
 *
 * @param content - Content that may contain double colons
 * @returns Content with double colons converted to single colons
 */
export function removeColonsInContent(content: string): string {
  if (!content) return "";

  return content
    .split("\n")
    .map((line) => {
      // Remove all :: to prevent any field creation in content
      return line.replace(/::/g, ":");
    })
    .join("\n");
}
