import { getTranscriptCache, addTranscriptsToCache } from "../cache";
import { listVideos, getVideo } from "../api";
import type { Video, TranscriptSentence } from "../types";
import { FETCH_CONCURRENCY, BATCH_DELAY_MS } from "../utils";

type Input = {
  query: string;
};

interface SearchResult {
  videoName: string;
  text: string;
  timestampSeconds: number;
  videoId: string;
}

// Common English stopwords to ignore in keyword search
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "we",
  "they",
  "what",
  "which",
  "who",
  "whom",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "about",
]);

// Tokenize query into keywords
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

// Calculate match score for a sentence
function calculateScore(sentenceText: string, keywords: string[]): number {
  const lowerText = sentenceText.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      score += 1;
      // Bonus for exact word match (not just substring)
      // Escape special regex characters in keyword for safety
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escapedKeyword}\\b`).test(lowerText)) {
        score += 0.5;
      }
    }
  }

  return score;
}

// Format timestamp as MM:SS
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Fetch all transcripts and cache them
async function fetchAndCacheTranscripts(): Promise<
  Record<
    string,
    { videoName: string; text: string; sentences?: TranscriptSentence[] }
  >
> {
  const transcripts: Record<
    string,
    { videoName: string; text: string; sentences?: TranscriptSentence[] }
  > = {};

  // Get all videos
  const allVideos: Video[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await listVideos({ cursor, limit: 50 });
    allVideos.push(...response.videos);
    cursor = response.pagination.nextCursor;
    hasMore = response.pagination.hasMore;
  }

  // Fetch transcripts in batches with delay to avoid rate limiting
  for (let i = 0; i < allVideos.length; i += FETCH_CONCURRENCY) {
    const batch = allVideos.slice(i, i + FETCH_CONCURRENCY);

    // Add delay between batches (but not before the first batch)
    if (i > 0 && BATCH_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }

    const batchResults = await Promise.allSettled(
      batch.map(async (video) => {
        const response = await getVideo(video.id);
        return { video, transcript: response.video.transcript };
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        const { video, transcript } = result.value;
        if (transcript && transcript.status === "ready") {
          transcripts[video.id] = {
            videoName: video.name,
            text: transcript.text,
            sentences: transcript.sentences,
          };
        }
      }
    }
  }

  // Cache the transcripts
  const cacheData: Record<
    string,
    {
      status: "ready";
      text: string;
      videoName: string;
      sentences?: TranscriptSentence[];
    }
  > = {};
  for (const [videoId, data] of Object.entries(transcripts)) {
    cacheData[videoId] = {
      status: "ready",
      text: data.text,
      videoName: data.videoName,
      sentences: data.sentences,
    };
  }
  await addTranscriptsToCache(cacheData);

  return transcripts;
}

export default async function tool(input: Input): Promise<string> {
  const { query } = input;

  if (!query || query.trim().length === 0) {
    return "Please provide a search query to search your video transcripts.";
  }

  // Load transcript cache
  let transcriptCache = await getTranscriptCache();

  // If cache is empty, fetch and cache transcripts
  if (
    !transcriptCache ||
    Object.keys(transcriptCache.transcripts).length === 0
  ) {
    const transcripts = await fetchAndCacheTranscripts();
    if (Object.keys(transcripts).length === 0) {
      return "No video transcripts found. Make sure you have videos with transcripts in your Tella account.";
    }
    // Reload cache after fetching
    transcriptCache = await getTranscriptCache();
    if (!transcriptCache) {
      return "Failed to cache transcripts. Please try again.";
    }
  }

  // Tokenize query
  const keywords = tokenize(query);
  if (keywords.length === 0) {
    // Fall back to full query if all words were stopwords
    keywords.push(query.toLowerCase().trim());
  }

  // Search all transcripts
  const results: SearchResult[] = [];

  for (const [videoId, cached] of Object.entries(transcriptCache.transcripts)) {
    if (cached.status !== "ready") continue;

    // If we have sentences, search at sentence level for better timestamps
    if (cached.sentences && cached.sentences.length > 0) {
      for (const sentence of cached.sentences) {
        const score = calculateScore(sentence.text, keywords);
        if (score > 0) {
          results.push({
            videoName: cached.videoName,
            text: sentence.text,
            timestampSeconds: sentence.startSeconds,
            videoId,
          });
        }
      }
    } else {
      // Fall back to full text search
      const score = calculateScore(cached.text, keywords);
      if (score > 0) {
        // Extract a relevant excerpt (first 200 chars around first match)
        const lowerText = cached.text.toLowerCase();
        const firstKeyword = keywords.find((k) => lowerText.includes(k));
        let excerpt = cached.text;
        if (firstKeyword) {
          const index = lowerText.indexOf(firstKeyword);
          const start = Math.max(0, index - 100);
          const end = Math.min(cached.text.length, index + 200);
          excerpt = cached.text.slice(start, end);
          if (start > 0) excerpt = "..." + excerpt;
          if (end < cached.text.length) excerpt = excerpt + "...";
        } else {
          excerpt =
            cached.text.slice(0, 300) + (cached.text.length > 300 ? "..." : "");
        }

        results.push({
          videoName: cached.videoName,
          text: excerpt,
          timestampSeconds: 0,
          videoId,
        });
      }
    }
  }

  // Sort by relevance (number of keyword matches)
  results.sort((a, b) => {
    const scoreA = calculateScore(a.text, keywords);
    const scoreB = calculateScore(b.text, keywords);
    return scoreB - scoreA;
  });

  // Limit results
  const topResults = results.slice(0, 10);

  if (topResults.length === 0) {
    return `No results found for "${query}" in your video transcripts. Try different keywords.`;
  }

  // Format output with video links for deep-linking
  let output = `Found ${results.length} relevant excerpt${results.length === 1 ? "" : "s"} for "${query}":\n\n`;

  for (const result of topResults) {
    const timestamp = formatTimestamp(result.timestampSeconds);
    const videoUrl = `https://www.tella.tv/video/${result.videoId}`;
    output += `**Video: "${result.videoName}"** at ${timestamp}\n`;
    output += `> "${result.text.trim()}"\n`;
    output += `[Watch Video](${videoUrl})\n\n`;
  }

  if (results.length > 10) {
    output += `\n_...and ${results.length - 10} more results._`;
  }

  return output;
}
