import { Color, environment, Image, Keyboard } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ExistingPost } from "./types";

dayjs.extend(relativeTime);

// Sorting

export function sortByScheduled(a: ExistingPost, b: ExistingPost) {
  return new Date(a.scheduled_for ?? "").getTime() - new Date(b.scheduled_for ?? "").getTime();
}

export function sortByPublished(a: ExistingPost, b: ExistingPost) {
  return new Date(b.posted_at ?? "").getTime() - new Date(a.posted_at ?? "").getTime();
}

export function splitContentIntoTweetSizedChunks(content: string): { id: string; content: string }[] {
  const MAX_LENGTH = 280;

  // If content already fits in a single tweet
  if (content.length <= MAX_LENGTH) {
    return [
      {
        id: Math.random().toString(36).substring(2, 15),
        content,
      },
    ];
  }

  const chunks: string[] = [];
  let remainingContent = content;

  while (remainingContent.length > 0) {
    if (remainingContent.length <= MAX_LENGTH) {
      // Add the remaining content as the last chunk
      chunks.push(remainingContent);
      break;
    }

    // Try to find a good split point within MAX_LENGTH
    let splitIndex = -1;

    // First try to split on paragraph breaks
    const paragraphBreakIndex = remainingContent.lastIndexOf("\n\n", MAX_LENGTH);
    if (paragraphBreakIndex > 0) {
      splitIndex = paragraphBreakIndex + 2; // Include the newlines with the first chunk
    } else {
      // Next, try to split on single newlines
      const newlineIndex = remainingContent.lastIndexOf("\n", MAX_LENGTH);
      if (newlineIndex > 0) {
        splitIndex = newlineIndex + 1; // Include the newline with the first chunk
      } else {
        // Try to split on sentence boundaries
        const sentenceEndRegex = /[.!?]\s+/g;
        let match;
        let lastMatchIndex = -1;

        // Find the last sentence boundary within MAX_LENGTH
        while ((match = sentenceEndRegex.exec(remainingContent)) !== null) {
          if (match.index < MAX_LENGTH) {
            lastMatchIndex = match.index + match[0].length;
          } else {
            break;
          }
        }

        if (lastMatchIndex > 0) {
          splitIndex = lastMatchIndex;
        } else {
          // Try to split on commas or other punctuation
          const punctuationRegex = /[,;:]\s+/g;
          match = null;
          lastMatchIndex = -1;

          // Find the last punctuation within MAX_LENGTH
          while ((match = punctuationRegex.exec(remainingContent)) !== null) {
            if (match.index < MAX_LENGTH) {
              lastMatchIndex = match.index + match[0].length;
            } else {
              break;
            }
          }

          if (lastMatchIndex > 0) {
            splitIndex = lastMatchIndex;
          } else {
            // Last resort: split on word boundaries
            const lastSpaceIndex = remainingContent.lastIndexOf(" ", MAX_LENGTH);
            if (lastSpaceIndex > 0) {
              splitIndex = lastSpaceIndex + 1; // Include the space with the first chunk
            } else {
              // If there's no good splitting point, just cut at MAX_LENGTH
              splitIndex = MAX_LENGTH;
            }
          }
        }
      }
    }

    // Extract the chunk and update remaining content
    const chunk = remainingContent.substring(0, splitIndex).trim();
    remainingContent = remainingContent.substring(splitIndex).trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks.map((content) => ({
    id: Math.random().toString(36).substring(2, 15),
    content,
  }));
}
