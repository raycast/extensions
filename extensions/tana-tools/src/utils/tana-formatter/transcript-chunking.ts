/**
 * Smart transcript chunking utilities
 * Extracted from the sophisticated tana-converter chunking logic
 */

/**
 * Represents a single chunk of transcript content with metadata
 *
 * @interface TranscriptChunk
 * @property {string} content - The text content of this chunk
 * @property {number} chunkNumber - Sequential number of this chunk (1-indexed)
 * @property {number} [totalChunks] - Total number of chunks in the complete transcript
 * @property {number} [wordCount] - Number of words in this chunk's content
 */
export interface TranscriptChunk {
  content: string;
  chunkNumber: number;
  totalChunks?: number;
  wordCount?: number;
}

/**
 * Smart transcript chunking with sentence and word boundary detection
 * @param transcript Complete transcript text
 * @param maxSize Maximum chunk size (default: 7000)
 * @returns Array of properly chunked transcript segments
 */
export function chunkTranscript(
  transcript: string,
  maxSize: number = 7000,
): TranscriptChunk[] {
  if (!transcript || transcript.trim().length === 0) {
    return [];
  }

  const transcriptLength = transcript.length;

  // If transcript is small enough, return as single chunk
  if (transcriptLength <= maxSize) {
    return [
      {
        content: transcript.trim(),
        chunkNumber: 1,
        totalChunks: 1,
        wordCount: countWords(transcript),
      },
    ];
  }

  const chunks: TranscriptChunk[] = [];
  let currentPosition = 0;
  let chunkNumber = 1;

  while (currentPosition < transcriptLength) {
    // Calculate target chunk end position
    const targetEnd = currentPosition + maxSize;

    // Find the best split point using smart boundary detection
    let actualEnd = findBestSplitPoint(
      transcript,
      Math.min(targetEnd, transcriptLength),
      currentPosition,
    );

    // Guard against infinite loop: ensure forward progress
    if (actualEnd <= currentPosition) {
      // Force a minimum chunk size to prevent content loss
      const minChunkSize = Math.max(100, Math.floor(maxSize * 0.1));
      actualEnd = Math.min(currentPosition + minChunkSize, transcriptLength);
    }

    // Extract chunk content
    const chunkContent = transcript.slice(currentPosition, actualEnd).trim();

    // Skip empty chunks
    if (chunkContent.length === 0) {
      currentPosition = actualEnd;
      continue;
    }

    // Create chunk
    const chunk: TranscriptChunk = {
      content: chunkContent,
      chunkNumber,
      wordCount: countWords(chunkContent),
    };

    chunks.push(chunk);

    // Move to next position
    currentPosition = actualEnd;
    chunkNumber += 1;
  }

  // Add total chunks count to all chunks
  const totalChunks = chunks.length;
  chunks.forEach((chunk) => {
    chunk.totalChunks = totalChunks;
  });

  return chunks;
}

/**
 * Find the optimal split point near a target position using intelligent boundary detection
 *
 * Attempts to split transcript content at natural boundaries (sentences, then words)
 * to maintain readability and context. Searches within a reasonable range around
 * the target position to find the best split point.
 *
 * @param text - The complete text to analyze for split points
 * @param targetPosition - Desired position to split near
 * @param currentPosition - Current processing position (for progress validation)
 * @returns The optimal character position to split the text
 */
function findBestSplitPoint(
  text: string,
  targetPosition: number,
  currentPosition: number = 0,
): number {
  const textLength = text.length;
  if (targetPosition >= textLength) {
    return textLength;
  }

  // Look for sentence boundaries within a reasonable range
  const searchRange = Math.min(300, Math.floor(textLength * 0.1));
  const searchStart = Math.max(0, targetPosition - searchRange);
  const searchEnd = Math.min(textLength, targetPosition + searchRange);

  // Find sentence boundaries in the search range
  const searchText = text.slice(searchStart, searchEnd);
  const sentencePattern = /[.!?]+\s+/g;
  const sentenceMatches = Array.from(searchText.matchAll(sentencePattern));

  if (sentenceMatches.length > 0) {
    // Find the sentence boundary closest to our target
    const targetRelative = targetPosition - searchStart;

    let bestMatch = sentenceMatches[0];
    let bestDistance = Math.abs((bestMatch.index ?? 0) - targetRelative);

    for (const match of sentenceMatches) {
      const matchIndex = match.index ?? 0;
      const distance = Math.abs(matchIndex - targetRelative);

      if (distance < bestDistance) {
        bestMatch = match;
        bestDistance = distance;
      }
    }

    // Return the position after the sentence boundary
    const matchIndex = bestMatch.index ?? 0;
    const matchLength = bestMatch[0]?.length ?? 0;
    const splitPoint = searchStart + matchIndex + matchLength;

    // Ensure forward progress
    if (splitPoint > currentPosition) {
      return splitPoint;
    }
  }

  // If no sentence boundary found, look for word boundaries
  const words = searchText.split(/\s+/);
  let currentPos = 0;
  let bestWordSplit = searchStart;

  for (const word of words) {
    const wordEnd = currentPos + word.length;
    const wordCenter = currentPos + Math.floor(word.length / 2);

    if (
      Math.abs(searchStart + wordCenter - targetPosition) <
      Math.abs(bestWordSplit - targetPosition)
    ) {
      bestWordSplit = searchStart + wordEnd;
    }

    currentPos = wordEnd + 1; // +1 for the space
  }

  const wordSplitResult = Math.min(bestWordSplit, textLength);

  // Ensure forward progress - if no good split point found, advance by minimum amount
  if (wordSplitResult <= currentPosition) {
    // Fallback: advance by at least 50 characters or to next space, whichever comes first
    const minAdvance = 50;
    let fallbackPosition = currentPosition + minAdvance;

    // Look for next space within reasonable distance
    const nextSpaceIndex = text.indexOf(" ", currentPosition + 10);
    if (
      nextSpaceIndex !== -1 &&
      nextSpaceIndex < currentPosition + minAdvance * 2
    ) {
      fallbackPosition = nextSpaceIndex + 1;
    }

    return Math.min(fallbackPosition, textLength);
  }

  return wordSplitResult;
}

/**
 * Count the number of words in text content
 *
 * Splits text on whitespace and filters out empty strings to get an accurate
 * word count. Used for chunk metadata and sizing calculations.
 *
 * @param text - The text content to count words in
 * @returns Number of words in the text, or 0 if text is empty
 */
function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.trim().length > 0).length;
}
