const PLAYER_URL =
  "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const USER_AGENT =
  "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip";

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
};

type Thumbnail = {
  url: string;
};

type PlayerResponse = {
  videoDetails?: {
    videoId: string;
    title: string;
    lengthSeconds: string;
    thumbnail: { thumbnails: Thumbnail[] };
    author: string;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

export type VideoData = {
  videoId: string;
  title: string;
  duration: string;
  ownerChannelName: string;
  thumbnail: Thumbnail | undefined;
  video_url: string;
};

function extractVideoId(input: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  throw new Error(`Could not extract video ID from: ${input}`);
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hours`);
  if (minutes > 0) parts.push(`${minutes} minutes`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} seconds`);
  return parts.join(" ");
}

async function fetchPlayerData(videoId: string): Promise<PlayerResponse> {
  const response = await fetch(PLAYER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "19.09.37",
          androidSdkVersion: 30,
          hl: "en",
          gl: "US",
        },
      },
      videoId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Player API returned ${response.status}`);
  }

  return (await response.json()) as PlayerResponse;
}

function parseTranscriptXml(xml: string): string {
  const segments = xml.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [];

  const text = segments
    .map((segment) =>
      segment
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
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

  if (!text) {
    throw new Error("Transcript text is empty after parsing");
  }

  return text;
}

async function fetchTranscriptFromCaptions(
  captionTracks: CaptionTrack[],
): Promise<string> {
  const track =
    captionTracks.find((t) => t.languageCode === "en") || captionTracks[0];

  const response = await fetch(track.baseUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Caption fetch returned ${response.status}`);
  }

  const xml = await response.text();
  if (!xml || xml.length === 0) {
    throw new Error("Empty caption response");
  }

  return parseTranscriptXml(xml);
}

export async function fetchVideoData(
  input: string,
): Promise<{ videoData: VideoData; transcript: string }> {
  const videoId = extractVideoId(input);
  const playerData = await fetchPlayerData(videoId);

  const details = playerData.videoDetails;
  if (!details) {
    throw new Error("No video details in player response");
  }

  const captionTracks =
    playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks available");
  }

  const transcript = await fetchTranscriptFromCaptions(captionTracks);

  const videoData: VideoData = {
    videoId: details.videoId,
    title: details.title,
    duration: formatDuration(Number(details.lengthSeconds)),
    ownerChannelName: details.author,
    thumbnail: details.thumbnail.thumbnails.at(-1),
    video_url: `https://www.youtube.com/watch?v=${details.videoId}`,
  };

  return { videoData, transcript };
}
