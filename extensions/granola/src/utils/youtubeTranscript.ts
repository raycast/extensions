import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

export interface TranscriptEntry {
  text: string;
  duration: number;
  offset: number;
}

export interface YouTubeTranscriptResult {
  transcript: string;
  title?: string;
  videoId: string;
}

/**
 * Checks if the input string is a YouTube URL
 * Supports:
 * - Standard videos: https://www.youtube.com/watch?v=VIDEO_ID
 * - Short URLs: https://youtu.be/VIDEO_ID
 * - YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
 * - Embedded videos: https://www.youtube.com/embed/VIDEO_ID
 * - Direct video IDs: VIDEO_ID
 */
export function isYouTubeURL(input: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/i;
  const directVideoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  const trimmedInput = input.trim();

  return youtubeRegex.test(trimmedInput) || directVideoIdRegex.test(trimmedInput);
}

/**
 * Extracts video ID from various YouTube URL formats
 * Supports:
 * - Standard videos: https://www.youtube.com/watch?v=VIDEO_ID
 * - Short URLs: https://youtu.be/VIDEO_ID
 * - YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
 * - Embedded videos: https://www.youtube.com/embed/VIDEO_ID
 * - Direct video IDs: VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetches transcript from YouTube URL
 */
export async function fetchYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error("Invalid YouTube URL or video ID");
  }

  try {
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptData || transcriptData.length === 0) {
      throw new Error("No transcript available for this video");
    }

    // Convert transcript entries to plain text
    const transcript = transcriptData
      .map((entry: TranscriptEntry) => entry.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!transcript) {
      throw new Error("Transcript is empty");
    }

    return {
      transcript,
      videoId,
      title: `YouTube Video ${videoId}`, // We could enhance this to fetch actual title if needed
    };
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific YouTube transcript errors
      if (error.message.includes("Too many requests")) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.message.includes("Video unavailable")) {
        throw new Error("Video is not available or has been removed.");
      } else if (error.message.includes("Transcript disabled")) {
        throw new Error("Transcripts are disabled for this video.");
      } else if (error.message.includes("not available")) {
        throw new Error("No transcript is available for this video.");
      }
    }

    throw new Error(`Failed to fetch YouTube transcript: ${error}`);
  }
}

/**
 * Process input - either fetch from YouTube or return as manual transcript
 */
export async function processTranscriptInput(input: string): Promise<{
  transcript: string;
  isFromYouTube: boolean;
  videoId?: string;
  title?: string;
}> {
  const trimmedInput = input.trim();

  if (isYouTubeURL(trimmedInput)) {
    const result = await fetchYouTubeTranscript(trimmedInput);
    return {
      transcript: result.transcript,
      isFromYouTube: true,
      videoId: result.videoId,
      title: result.title,
    };
  } else {
    return {
      transcript: trimmedInput,
      isFromYouTube: false,
    };
  }
}
