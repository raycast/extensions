import ytdl from "ytdl-core";

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
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

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const CLIENT_VERSION = "20.10.38";
const USER_AGENT = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

export async function fetchTranscript(video: string): Promise<string> {
  const videoId = ytdl.getVideoID(video);

  const playerResponse = await fetch(PLAYER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: CLIENT_VERSION,
        },
      },
      videoId,
    }),
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

  const transcriptText = parseTranscriptXml(xml);

  if (!transcriptText) {
    throw new Error("Transcript text is empty after parsing");
  }

  return transcriptText;
}

function parseTranscriptXml(xml: string): string {
  // Try srv3 format first (<p> tags with nested <s> tags)
  const pSegments = xml.match(/<p[^>]*>[\s\S]*?<\/p>/g);
  // Fall back to srv1 format (<text> tags)
  const textSegments = xml.match(/<text[^>]*>[\s\S]*?<\/text>/g);

  const segments = pSegments?.length ? pSegments : (textSegments ?? []);

  return segments
    .map((segment: string) => {
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
}
