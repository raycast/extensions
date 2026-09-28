import fs from "node:fs";
import type { RecognizedTrack } from "../types";

// Only the fields we consume; AudD's payload is much larger.
interface AudDResult {
  artist?: string;
  title?: string;
  album?: string;
  release_date?: string;
  song_link?: string;
  apple_music?: { url?: string; artwork?: { url?: string } };
  spotify?: {
    external_urls?: { spotify?: string };
    album?: { images?: { url?: string; width?: number }[] };
  };
}

interface AudDResponse {
  status?: string;
  result?: AudDResult | null;
  error?: { error_code?: number; error_message?: string };
}

const ENDPOINT = "https://api.audd.io/";
// Node's fetch has no default timeout; without this a stalled upload leaves
// the command spinning on "Identifying..." with no way out but closing it.
const REQUEST_TIMEOUT_MS = 30_000;

/** Apple's artwork URLs are templates that need a concrete size. */
function appleArtwork(url: string | undefined): string | undefined {
  return url?.replace("{w}x{h}", "600x600");
}

/** AudD appends its own affiliate parameters; link to the plain page instead. */
function stripQuery(url: string | undefined): string | undefined {
  return url?.split("?")[0];
}

function describeError(error: AudDResponse["error"]): string {
  switch (error?.error_code) {
    case 900:
      return (
        "AudD rejected the token. Check it in the extension preferences, and that your account " +
        "at dashboard.audd.io has an active trial or subscription."
      );
    case 901:
      return "AudD request limit reached for this token. Check your plan at dashboard.audd.io.";
    case 902:
      // Sent when the account has no usable allowance at all, which reads as
      // "the limit was reached" in AudD's own wording - misleading on an
      // account that simply never had an active plan.
      return "AudD declined the request: this account has no requests available. Check your plan at dashboard.audd.io.";
    default:
      return `AudD error ${error?.error_code ?? "?"}: ${error?.error_message ?? "unknown"}`;
  }
}

/**
 * Sends the recording to AudD's music recognition API and maps the response
 * onto our track model. Returns null when AudD has no match.
 */
export async function recognizeWithAudd(wavPath: string, apiToken: string): Promise<RecognizedTrack | null> {
  const form = new FormData();
  form.append("api_token", apiToken);
  form.append("return", "apple_music,spotify");
  form.append("file", new Blob([fs.readFileSync(wavPath)], { type: "audio/wav" }), "capture.wav");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, { method: "POST", body: form, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new Error("Could not reach AudD. Check your internet connection and try again.");
  }
  if (!response.ok) {
    throw new Error(`AudD responded with HTTP ${response.status}.`);
  }

  let payload: AudDResponse;
  try {
    payload = (await response.json()) as AudDResponse;
  } catch {
    throw new Error("AudD returned a response that could not be read.");
  }
  if (payload.status !== "success") {
    throw new Error(describeError(payload.error));
  }

  const result = payload.result;
  if (!result?.title) return null;

  const title = result.title;
  const artist = result.artist ?? "Unknown Artist";
  const spotifyImages = result.spotify?.album?.images ?? [];
  const largestSpotifyImage = spotifyImages.reduce<{ url?: string; width?: number } | undefined>(
    (best, image) => ((image.width ?? 0) > (best?.width ?? 0) ? image : best),
    undefined,
  );

  return {
    id: `${artist}-${title}-${Date.now()}`,
    title,
    artist,
    album: result.album,
    year: result.release_date?.slice(0, 4),
    coverUrl: largestSpotifyImage?.url ?? appleArtwork(result.apple_music?.artwork?.url),
    songUrl: result.song_link,
    spotifyUrl: result.spotify?.external_urls?.spotify,
    // AudD doesn't return a YouTube Music link; the actions fall back to search.
    appleMusicUrl: stripQuery(result.apple_music?.url),
    recognizedAt: Date.now(),
  };
}
