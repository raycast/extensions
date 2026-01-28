import { showHUD, Clipboard, open, getPreferenceValues } from "@raycast/api";

// List of random words for meeting names
const RANDOM_WORDS = [
  "happy",
  "sunny",
  "bright",
  "cosmic",
  "stellar",
  "lunar",
  "solar",
  "quantum",
  "dynamic",
  "swift",
  "agile",
  "creative",
  "clever",
  "genius",
  "smart",
  "wise",
  "blue",
  "green",
  "red",
  "purple",
  "golden",
  "silver",
  "crystal",
  "diamond",
  "mountain",
  "river",
  "ocean",
  "forest",
  "desert",
  "valley",
  "peak",
  "wave",
  "phoenix",
  "dragon",
  "eagle",
  "falcon",
  "hawk",
  "owl",
  "tiger",
  "lion",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "omega",
  "sigma",
  "theta",
  "lambda",
];

function getRandomWord(): string {
  return RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
}

function getRandomString(length: number = 6): string {
  let result = "";
  while (result.length < length) {
    result += Math.random().toString(36).substring(2);
  }
  return result.substring(0, length);
}

function generateMeetingId(format: string, customPrefix: string): string {
  switch (format) {
    case "timestamp-random":
      return `${Date.now()}-${getRandomString()}`;

    case "random-words":
      return `${getRandomWord()}-${getRandomWord()}-${getRandomString(4)}`;

    case "custom-prefix":
      return `${customPrefix}-${getRandomString(8)}`;

    case "random-only":
      return getRandomString(12);

    default:
      return `${Date.now()}-${getRandomString()}`;
  }
}

function buildJitsiUrl(
  server: string,
  meetingId: string,
  videoMuted: boolean,
  audioMuted: boolean,
  username: string,
): string {
  // Ensure server doesn't have protocol or trailing slash
  const cleanServer = server.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Build base URL
  let url = `https://${cleanServer}/${meetingId}`;

  // Add hash parameters for config and userInfo
  const params: string[] = [];

  if (videoMuted) {
    params.push("config.startWithVideoMuted=true");
  }

  if (audioMuted) {
    params.push("config.startWithAudioMuted=true");
  }

  if (username && username.trim()) {
    // Encode the entire parameter including quotes to preserve special characters
    const encodedName = encodeURIComponent(`"${username.trim()}"`);
    params.push(`userInfo.displayName=${encodedName}`);
  }

  if (params.length > 0) {
    url += `#${params.join("&")}`;
  }

  return url;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences.CreateJitsiMeetLink>();

  try {
    // Generate meeting ID based on selected format
    const meetingId = generateMeetingId(preferences.meetingNameFormat, preferences.customPrefix);

    // Build clean URL for sharing (without personal settings)
    const cleanServer = preferences.jitsiServer.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const shareableUrl = `https://${cleanServer}/${meetingId}`;

    // Build the full Jitsi URL with personal settings for opening in browser
    const jitsiUrlWithSettings = buildJitsiUrl(
      preferences.jitsiServer,
      meetingId,
      preferences.startWithVideoMuted,
      preferences.startWithAudioMuted,
      preferences.defaultUsername,
    );

    // Copy clean URL to clipboard (for sharing with others)
    await Clipboard.copy(shareableUrl);

    // Open in browser with personal settings if enabled
    if (preferences.autoOpenBrowser) {
      await open(jitsiUrlWithSettings);
      await showHUD("Jitsi Meet created and opened! Clean URL copied to clipboard");
    } else {
      await showHUD("Jitsi Meet link created and copied to clipboard");
    }
  } catch (error) {
    console.error("Error creating Jitsi Meet:", error);
    await showHUD("Failed to create Jitsi Meet");
  }
}
