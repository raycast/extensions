/**
 * Unified Tana Formatter
 * Single entry point for all Tana formatting with automatic content type detection
 */

import { detectContentType, isYouTubeTranscript } from "./content-detection";
import {
  processLimitlessPendantTranscript,
  processLimitlessAppTranscript,
  processYouTubeTranscript,
  processAndChunkTranscript,
  removeColonsInContent,
} from "./content-processing";
import {
  formatMetadataFields,
  formatContentField,
  formatTranscriptChunks,
  formatTranscriptField,
  formatTranscriptFieldWithSiblings,
  formatLinesAsHierarchy,
  formatTitleLine,
} from "./field-formatting";

// Re-export types and utilities that commands might need
export type { TranscriptChunk } from "./transcript-chunking";
export type { ContentType } from "./content-detection";

/**
 * Options for formatting content to Tana format
 */
export interface TanaFormatOptions {
  title?: string;
  url?: string;
  channelUrl?: string;
  description?: string;
  author?: string;
  content?: string;
  lines?: string[];
  duration?: string;
  useSwipeTag?: boolean;
  transcriptAsFields?: boolean; // Whether to format transcripts as fields vs sibling nodes
  // User preference values
  videoTag?: string;
  articleTag?: string;
  transcriptTag?: string;
  noteTag?: string;
  urlField?: string;
  authorField?: string;
  transcriptField?: string;
  contentField?: string;
  includeAuthor?: boolean;
  includeDescription?: boolean;
}

/**
 * Main Tana formatting function - single entry point for all content types
 * Automatically detects content type and applies appropriate processing
 */
export function formatForTana(options: TanaFormatOptions): string {
  // Detect what type of content we're dealing with
  const contentType = detectContentType(options);

  switch (contentType) {
    case "limitless-pendant":
      return formatLimitlessPendantTranscript(options);

    case "limitless-app":
      return formatLimitlessAppTranscript(options);

    case "youtube-video":
      return formatYouTubeVideoContent(options);

    case "youtube-transcript":
      return formatYouTubeTranscript(options);

    case "browser-page":
      return formatBrowserPageContent(options);

    case "selected-text":
      return formatSelectedTextContent(options);

    case "plain-text":
    default:
      return formatPlainTextContent(options);
  }
}

/**
 * Format Limitless Pendant transcription for Tana
 *
 * Processes raw Limitless Pendant transcript data by cleaning it up,
 * chunking it into manageable segments, and formatting as Tana nodes.
 *
 * @param options - Formatting options containing content or lines
 * @returns Formatted Tana Paste string with %%tana%% header
 */
function formatLimitlessPendantTranscript(options: TanaFormatOptions): string {
  const rawContent =
    options.content || (options.lines ? options.lines.join("\n") : "");
  const singleLineTranscript = processLimitlessPendantTranscript(rawContent);
  const chunks = processAndChunkTranscript(singleLineTranscript);

  const lines = ["%%tana%%"];
  if (chunks.length > 0) {
    lines.push(...formatTranscriptChunks(chunks));
  }

  return lines.join("\n");
}

/**
 * Format Limitless App transcription for Tana
 *
 * Processes raw Limitless App transcript data by cleaning it up,
 * chunking it into manageable segments, and formatting as Tana nodes.
 *
 * @param options - Formatting options containing content or lines
 * @returns Formatted Tana Paste string with %%tana%% header
 */
function formatLimitlessAppTranscript(options: TanaFormatOptions): string {
  const rawContent =
    options.content || (options.lines ? options.lines.join("\n") : "");
  const singleLineTranscript = processLimitlessAppTranscript(rawContent);
  const chunks = processAndChunkTranscript(singleLineTranscript);

  const lines = ["%%tana%%"];
  if (chunks.length > 0) {
    lines.push(...formatTranscriptChunks(chunks));
  }

  return lines.join("\n");
}

/**
 * Format YouTube video content with metadata and transcript for Tana
 *
 * Creates a comprehensive Tana node structure including video title with #video tag,
 * metadata fields (URL, channel, author, duration, description), and transcript
 * content if available. Transcript is chunked and formatted as child nodes.
 *
 * @param options - Formatting options with video metadata and transcript content
 * @returns Formatted Tana Paste string with complete video information
 */
function formatYouTubeVideoContent(options: TanaFormatOptions): string {
  const lines = ["%%tana%%"];

  if (options.title) {
    // YouTube video title with custom video tag (empty string means no tag)
    const videoTag = options.videoTag;
    const tags = videoTag ? [videoTag] : [];
    lines.push(formatTitleLine(options.title, tags));

    // Add metadata fields (description will be properly processed here)
    lines.push(
      ...formatMetadataFields({
        url: options.url,
        channelUrl: options.channelUrl,
        author: options.author,
        duration: options.duration,
        description: options.description,
        urlField: options.urlField,
        authorField: options.authorField,
        includeAuthor: options.includeAuthor,
        includeDescription: options.includeDescription,
      }),
    );

    // Handle transcript if present in content
    const rawContent = options.content || "";
    if (rawContent && isYouTubeTranscript(rawContent)) {
      const transcriptContent = processYouTubeTranscript(rawContent);
      if (transcriptContent && transcriptContent.trim().length > 0) {
        const chunks = processAndChunkTranscript(transcriptContent);

        if (chunks.length > 0) {
          // Format transcript as children under Transcript:: field
          lines.push(
            ...formatTranscriptFieldWithSiblings(
              chunks,
              options.transcriptField,
            ),
          );
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format standalone YouTube transcript content for Tana
 *
 * Processes YouTube transcript text, applies smart chunking for readability,
 * and formats as Tana nodes. Can include video metadata or format as standalone
 * transcript chunks depending on options.
 *
 * @param options - Formatting options with transcript content and optional metadata
 * @returns Formatted Tana Paste string with transcript content
 */
function formatYouTubeTranscript(options: TanaFormatOptions): string {
  const rawContent =
    options.content || (options.lines ? options.lines.join("\n") : "");
  const transcriptContent = processYouTubeTranscript(rawContent);
  const chunks = processAndChunkTranscript(transcriptContent);

  const lines = ["%%tana%%"];

  if (options.title) {
    // Include video metadata
    const transcriptTag = options.transcriptTag;
    const tags = transcriptTag ? [transcriptTag] : [];
    lines.push(formatTitleLine(options.title, tags));
    lines.push(
      ...formatMetadataFields({
        url: options.url,
        channelUrl: options.channelUrl,
        author: options.author,
        duration: options.duration,
        description: options.description,
        urlField: options.urlField,
        authorField: options.authorField,
        includeAuthor: options.includeAuthor,
        includeDescription: options.includeDescription,
      }),
    );

    if (options.transcriptAsFields) {
      lines.push(...formatTranscriptField(chunks, options.transcriptField));
    } else {
      lines.push(...formatTranscriptChunks(chunks));
    }
  } else {
    // Just transcript chunks
    lines.push(...formatTranscriptChunks(chunks));
  }

  return lines.join("\n");
}

/**
 * Format browser page content with metadata for Tana
 *
 * Extracts and formats web page content including title, URL, author, description,
 * and main content. Applies content cleaning, removes problematic characters,
 * and structures content hierarchically under a Content:: field.
 *
 * @param options - Formatting options with page metadata and content
 * @returns Formatted Tana Paste string with structured page content
 */
function formatBrowserPageContent(options: TanaFormatOptions): string {
  const lines = ["%%tana%%"];

  if (options.title) {
    const articleTag = options.articleTag;
    const tags = articleTag ? [articleTag] : [];
    lines.push(formatTitleLine(options.title, tags));

    // Add metadata fields
    lines.push(
      ...formatMetadataFields({
        url: options.url,
        channelUrl: options.channelUrl,
        author: options.author,
        duration: options.duration,
        description: options.description,
        urlField: options.urlField,
        authorField: options.authorField,
        includeAuthor: options.includeAuthor,
        includeDescription: options.includeDescription,
      }),
    );

    // Add content if present
    if (options.content) {
      // Clean content and remove colons to prevent field creation
      const cleanedContent = removeColonsInContent(options.content);
      // formatContentField handles all the hierarchical processing internally
      lines.push(...formatContentField(cleanedContent, options.contentField));
    }
  }

  return lines.join("\n");
}

/**
 * Format user-selected text content for Tana
 *
 * Takes an array of selected text lines and formats them as a hierarchical
 * Tana structure. Preserves line structure and applies proper indentation.
 * Applies noteTag if provided to tag the content as a note.
 *
 * @param options - Formatting options containing lines array and optional noteTag
 * @returns Formatted Tana Paste string with hierarchical text structure
 */
function formatSelectedTextContent(options: TanaFormatOptions): string {
  const lines = ["%%tana%%"];

  if (options.lines && options.lines.length > 0) {
    const formattedLines = formatLinesAsHierarchy(options.lines);

    // Apply note tag if provided
    if (options.noteTag && formattedLines.length > 0) {
      formattedLines[0] = formattedLines[0] + ` #${options.noteTag}`;
    }

    lines.push(...formattedLines);
  }

  return lines.join("\n");
}

/**
 * Format plain text content for Tana
 *
 * Takes raw text content, splits it into lines, and formats as a hierarchical
 * Tana structure. Filters out empty lines while preserving content structure.
 * Applies noteTag if provided to tag the content as a note.
 *
 * @param options - Formatting options containing raw text content and optional noteTag
 * @returns Formatted Tana Paste string with hierarchical text structure
 */
function formatPlainTextContent(options: TanaFormatOptions): string {
  const lines = ["%%tana%%"];

  if (options.content) {
    const contentLines = options.content
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const formattedLines = formatLinesAsHierarchy(contentLines);

    // Apply note tag if provided
    if (options.noteTag && formattedLines.length > 0) {
      formattedLines[0] = formattedLines[0] + ` #${options.noteTag}`;
    }

    lines.push(...formattedLines);
  }

  return lines.join("\n");
}

/**
 * Legacy wrapper for page info formatting (maintains backward compatibility)
 */
export interface PageInfo {
  title: string;
  url: string;
  description?: string;
  author?: string;
  content: string;
}

export function formatForTanaMarkdown(pageInfo: PageInfo): string {
  return formatForTana({
    title: pageInfo.title,
    url: pageInfo.url,
    description: pageInfo.description,
    author: pageInfo.author,
    content: pageInfo.content,
    useSwipeTag: true,
  });
}
