import { popToRoot, showToast, Toast } from "@raycast/api";

function extractVideoId(video: string): string {
  if (video.includes("youtube.com/watch")) {
    const match = video.match(/[?&]v=([^&]+)/);
    return match ? match[1] : video;
  }
  if (video.includes("youtu.be/")) {
    return video.split("youtu.be/")[1].split("?")[0];
  }
  return video;
}

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  name?: { simpleText: string };
};

type PlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
  playabilityStatus?: {
    status: string;
  };
};

export async function getVideoTranscript(video: string): Promise<string | undefined> {
  try {
    const videoId = extractVideoId(video);

    // Use ANDROID client which returns caption URLs that work
    const playerUrl = "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

    const playerPayload = {
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "19.09.37",
          androidSdkVersion: 30,
          hl: "en",
          gl: "US",
        },
      },
      videoId: videoId,
    };

    const playerResponse = await fetch(playerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
      body: JSON.stringify(playerPayload),
    });

    if (!playerResponse.ok) {
      throw new Error(`Player API returned ${playerResponse.status}`);
    }

    const playerData = (await playerResponse.json()) as PlayerResponse;

    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    // Prefer English, fall back to first available
    const track = captionTracks.find((t) => t.languageCode === "en") || captionTracks[0];

    // Fetch the captions XML
    const captionResponse = await fetch(track.baseUrl, {
      headers: {
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
    });

    if (!captionResponse.ok) {
      throw new Error(`Caption fetch returned ${captionResponse.status}`);
    }

    const xml = await captionResponse.text();

    if (!xml || xml.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    // Parse XML - format uses <p> tags (may contain nested <s> etc.)
    const segments = xml.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [];

    const transcriptText = segments
      .map((segment: string) => {
        // Strip tags to get text (handles nested elements like <s>)
        return segment
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      })
      .filter(Boolean)
      .join(" ")
      // Decode HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();

    if (!transcriptText) {
      showToast({
        style: Toast.Style.Failure,
        title: "❗",
        message: "Sorry, this video doesn't have a transcript.",
      });
      popToRoot();
      return undefined;
    }

    return transcriptText;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: "❗",
      message: "Sorry, this video doesn't have a transcript.",
    });
    popToRoot();
    return undefined;
  }
}
