// Utility functions for WordCalc

export interface StaticAnalysis {
  wordCount: number;
  characterCount: number;
  characterCountNoSpaces: number;
  paragraphCount: number;
  cleanedText: string;
}

// Count paragraphs more simply and safely
export function countParagraphs(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Handle HTML paragraphs first
  const htmlParagraphs = text.match(/<p[^>]*>.*?<\/p>/gi);
  if (htmlParagraphs && htmlParagraphs.length > 0) {
    return htmlParagraphs.length;
  }

  // Normalize line endings and remove HTML tags for plain text counting
  const processedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/<[^>]*>/g, " ");

  // Split by double line breaks first (most common paragraph separator)
  let paragraphs = processedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  // If no double line breaks found, split by single line breaks and filter meaningful content
  if (paragraphs.length <= 1 && processedText.includes("\n")) {
    paragraphs = processedText
      .split(/\n/)
      .filter((line) => line.trim().length > 15) // Reasonable minimum for a paragraph line
      .filter((line) => !/^[\s\-*+\d.]*$/.test(line.trim())); // Exclude lines with only list markers
  }

  // Ensure at least 1 paragraph if there's substantial content
  const finalCount = paragraphs.length;
  return finalCount > 0 ? finalCount : text.trim().length > 0 ? 1 : 0;
}

// Split analysis into static (text-based) and dynamic (speed-based) parts
export function analyzeTextStatic(text: string): StaticAnalysis {
  const cleanedText = cleanTextForWordCount(text);
  const words = cleanedText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const wordCount = words.length;
  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s/g, "").length;
  const paragraphCount = countParagraphs(text);

  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    paragraphCount,
    cleanedText,
  };
}

// Calculate time estimates from static analysis and speeds
export function calculateTimeEstimates(staticAnalysis: StaticAnalysis, readingWpm: number, speakingWpm: number) {
  const readingMinutes = staticAnalysis.wordCount / readingWpm;
  const speakingMinutes = staticAnalysis.wordCount / speakingWpm;

  return {
    readingTime: formatTime(readingMinutes),
    speakingTime: formatTime(speakingMinutes),
  };
}

export function cleanTextForWordCount(text: string): string {
  let cleaned = text;

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // Remove Markdown formatting
  // Headers
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");

  // Bold and italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1"); // **bold**
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1"); // *italic*
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1"); // __bold__
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1"); // _italic_

  // Strikethrough
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

  // Links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Images ![alt](url) -> alt
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " "); // Code blocks
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1"); // Inline code (keep content)

  // Blockquotes
  cleaned = cleaned.replace(/^>\s*/gm, "");

  // List markers
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, ""); // Unordered lists
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, ""); // Ordered lists

  // Tables - remove table formatting but keep content
  cleaned = cleaned.replace(/\|/g, " "); // Remove pipe characters
  cleaned = cleaned.replace(/^[\s\-:]+$/gm, ""); // Remove table separator lines

  // URLs (standalone)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");

  // Email addresses
  cleaned = cleaned.replace(/\S+@\S+\.\S+/g, "");

  // Multiple whitespace and newlines
  cleaned = cleaned.replace(/\s+/g, " ");

  // Clean up extra spaces and trim
  cleaned = cleaned.trim();

  return cleaned;
}

export function formatTime(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} sec${seconds !== 1 ? "s" : ""}`;
  }

  const totalMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - totalMinutes) * 60);

  if (seconds === 0) {
    return `${totalMinutes} min${totalMinutes !== 1 ? "s" : ""}`;
  }

  return `${totalMinutes}m ${seconds}s`;
}
