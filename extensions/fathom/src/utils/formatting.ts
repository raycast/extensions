/**
 * Formatting utilities for display
 */

import type { TranscriptSegment } from "../types/Types";

/**
 * Format transcript segments into readable markdown
 */
export function formatTranscriptToMarkdown(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const speakerPrefix = s.speaker ? `**${s.speaker}** (${s.timestamp}):\n` : `(${s.timestamp}):\n`;
      return speakerPrefix + s.text;
    })
    .join("\n\n");
}

/**
 * Extract email domain from email address
 */
export function extractEmailDomain(email: string): string | undefined {
  if (!email || !email.includes("@")) return undefined;
  return email.split("@")[1];
}
