import ytdl from "ytdl-core";

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

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const USER_AGENT = "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip";

export async function fetchTranscript(video: string): Promise<string> {
  const videoId = ytdl.getVideoID(video);

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

  const playerResponse = await fetch(PLAYER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(playerPayload),
  });

  if (!playerResponse.ok) {
    throw new Error(`Player API returned ${playerResponse.status}`);
  }

  const playerData = (await playerResponse.json()) as PlayerResponse;
  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks available");
  }

  const track = captionTracks.find((t) => t.languageCode === "en") || captionTracks[0];

  const captionResponse = await fetch(track.baseUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!captionResponse.ok) {
    throw new Error(`Caption fetch returned ${captionResponse.status}`);
  }

  const xml = await captionResponse.text();

  if (!xml || xml.length === 0) {
    throw new Error("Empty caption response");
  }

  // YouTube srv3 format uses <p> tags (may contain nested <s> tags)
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!transcriptText) {
    throw new Error("Transcript text is empty after parsing");
  }

  return transcriptText;
}
