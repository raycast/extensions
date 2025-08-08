/**
 * Content type detection utilities
 * Determines what type of content we're dealing with for appropriate processing
 */

/**
 * Detect if text is a Limitless Pendant transcription
 * Format: > [Speaker](#startMs=timestamp&endMs=timestamp): Content
 */
export function isLimitlessPendantTranscription(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const pendantFormatCount = text
    .split("\n")
    .filter((line) =>
      line.match(/^>\s*\[(.*?)\]\(#startMs=\d+&endMs=\d+\):/),
    ).length;

  return pendantFormatCount >= 2; // At least 2 lines to consider it a transcript
}

/**
 * Detect if text is in the new Limitless App transcription format
 * Format: Speaker Name followed by empty line, then timestamp, then content
 */
export function isLimitlessAppTranscription(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const lines = text.split("\n");

  // Count speakers (lines followed by empty lines)
  const speakerCount = lines
    .map((line, i) => ({ line: line.trim(), index: i }))
    .filter(
      ({ line, index }) =>
        line && index < lines.length - 1 && !lines[index + 1].trim(),
    ).length;

  // Count timestamps
  const timestampCount = lines.filter((line) =>
    line
      .trim()
      .match(
        /(Yesterday|Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}:\d{2}\s+(AM|PM)/,
      ),
  ).length;

  return speakerCount >= 2 && timestampCount >= 2;
}

/**
 * Detect if content contains a YouTube transcript
 */
export function isYouTubeTranscript(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Check if there's a Transcript field or marker
  return /\bTranscript:(?::|\s|\n)/i.test(text);
}

/**
 * Detect if content is browser page content with metadata
 */
export function isBrowserPageContent(options: {
  title?: string;
  url?: string;
  description?: string;
  content?: string;
}): boolean {
  // Has typical browser metadata structure
  return !!(options.title && options.url && options.content);
}

/**
 * Detect content type and return appropriate processing strategy
 */
export type ContentType =
  | "limitless-pendant"
  | "limitless-app"
  | "youtube-transcript"
  | "youtube-video"
  | "browser-page"
  | "selected-text"
  | "plain-text";

/**
 * Detect if content is YouTube video with metadata (not just transcript)
 */
export function isYouTubeVideo(options: {
  title?: string;
  url?: string;
  duration?: string;
  author?: string;
}): boolean {
  return !!(
    options.url &&
    (options.url.includes("youtube.com") || options.url.includes("youtu.be")) &&
    options.title
  );
}

/**
 * Automatically detect the type of content being processed for appropriate formatting
 *
 * Analyzes the provided options to determine what type of content is being formatted,
 * enabling the system to apply the most appropriate processing pipeline. This is the
 * main entry point for content type detection in the unified formatter.
 *
 * @param options - Content options containing title, URL, content, and other metadata
 * @returns ContentType enum value indicating the detected content type
 */
export function detectContentType(options: {
  title?: string;
  url?: string;
  description?: string;
  author?: string;
  content?: string;
  lines?: string[];
  duration?: string;
}): ContentType {
  // Check for YouTube video with metadata first
  if (isYouTubeVideo(options)) {
    return "youtube-video";
  }

  // Check raw content for transcript formats
  const rawContent =
    options.content || (options.lines ? options.lines.join("\n") : "");

  if (rawContent && isLimitlessPendantTranscription(rawContent)) {
    return "limitless-pendant";
  }

  if (rawContent && isLimitlessAppTranscription(rawContent)) {
    return "limitless-app";
  }

  if (rawContent && isYouTubeTranscript(rawContent)) {
    return "youtube-transcript";
  }

  if (isBrowserPageContent(options)) {
    return "browser-page";
  }

  if (options.lines && options.lines.length > 0) {
    return "selected-text";
  }

  return "plain-text";
}
