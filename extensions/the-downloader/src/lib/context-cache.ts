import { Cache } from "@raycast/api";
import { NoTranscriptError, fetchTranscriptSegments } from "../transcript.js";
import { slimVideo } from "./sources/video.js";
import { VideoContext } from "./video-context.js";

export { slimVideo };

// Fetching metadata and captions takes a few seconds; reopening a recent chat
// shouldn't. Contexts are cached on disk for a few hours, without the stream
// URLs yt-dlp includes (they're large and expire anyway).

const cache = new Cache({ namespace: "video-context" });
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Metadata and timestamped transcript for `url`. A video without usable
 * captions still loads, with an empty transcript, so its details can be asked about.
 */
export async function loadVideoContext(
  url: string,
  options: { signal?: AbortSignal; language?: string; force?: boolean } = {},
): Promise<VideoContext> {
  const language = options.language?.trim() || "auto";
  const key = `${language}|${url}`;
  if (!options.force) {
    const raw = cache.get(key);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as VideoContext;
        if (Date.now() - cached.fetchedAt < TTL_MS) return cached;
      } catch {
        /* corrupt entry — fetch again */
      }
    }
  }

  let ctx: VideoContext;
  try {
    const { video, segments, language: found } = await fetchTranscriptSegments(url, language, options.signal);
    ctx = { url, video: slimVideo(video), segments, language: found, fetchedAt: Date.now() };
  } catch (error) {
    if (!(error instanceof NoTranscriptError)) throw error;
    ctx = {
      url,
      video: slimVideo(error.video),
      segments: [],
      transcriptNote: error.message,
      transcriptReason: error.reason,
      fetchedAt: Date.now(),
    };
  }
  // Without a transcript, fetch again next time: captions may have been rate-limited or added since.
  if (ctx.segments.length > 0) {
    try {
      cache.set(key, JSON.stringify(ctx));
    } catch {
      /* cache full or unavailable — not worth failing over */
    }
  }
  return ctx;
}
