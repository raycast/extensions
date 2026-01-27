/**
 * Manual test for YouTube transcript fetching.
 * Run with: npm run test:transcript
 *
 * This test verifies the transcript extraction logic works with current YouTube internals.
 */

// Test video: Anthropic Claude Code announcement
const TEST_VIDEO_URL = "https://youtu.be/AJpK3YTTKZ4";

function extractVideoId(video: string): string {
  if (video.includes("youtube.com/watch?v=")) {
    return video.split("v=")[1].split("&")[0];
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

/**
 * Fetches YouTube video transcript using the ANDROID client API.
 * This approach works as of 2025/2026.
 */
async function getVideoTranscript(video: string): Promise<string | undefined> {
  try {
    const videoId = extractVideoId(video);

    console.log(`[1/3] Fetching player data for video: ${videoId}`);

    // Use ANDROID client which returns caption URLs that actually work
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
      console.log(`❌ FAILED: Player API returned ${playerResponse.status}`);
      return undefined;
    }

    const playerData = (await playerResponse.json()) as PlayerResponse;

    const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      console.log("❌ FAILED: No caption tracks found");
      if (playerData.playabilityStatus) {
        console.log(`  Playability status: ${playerData.playabilityStatus.status}`);
      }
      return undefined;
    }

    console.log(`[2/3] Found ${captionTracks.length} caption track(s)`);

    // Prefer English, fall back to first available
    const track = captionTracks.find((t) => t.languageCode === "en") || captionTracks[0];
    console.log(`  Using track: ${track.name?.simpleText || track.languageCode}`);

    // Fetch the captions XML
    const captionResponse = await fetch(track.baseUrl, {
      headers: {
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
    });

    if (!captionResponse.ok) {
      console.log(`❌ FAILED: Caption fetch returned ${captionResponse.status}`);
      return undefined;
    }

    const xml = await captionResponse.text();

    if (!xml || xml.length === 0) {
      console.log("❌ FAILED: Empty caption response");
      return undefined;
    }

    console.log(`[3/3] Parsing caption XML (${xml.length} bytes)`);

    // Parse XML - format uses <p> tags with t (time) and d (duration) attributes
    // Example: <p t="0" d="2669">Should we be doing like big smile or?</p>
    const segments = xml.match(/<p[^>]*>([^<]*)<\/p>/g) || [];

    if (segments.length === 0) {
      // Try alternative format with <text> tags
      const altSegments = xml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
      if (altSegments.length === 0) {
        console.log("❌ FAILED: Could not parse caption segments");
        console.log("  XML preview:", xml.substring(0, 200));
        return undefined;
      }
    }

    const transcriptText = segments
      .map((segment) => {
        const match = segment.match(/>([^<]*)</);
        return match ? match[1] : "";
      })
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
      console.log("❌ FAILED: Transcript text is empty after parsing");
      return undefined;
    }

    return transcriptText;
  } catch (error) {
    console.log(`❌ FAILED: ${error}`);
    return undefined;
  }
}

// Run the test
async function main() {
  console.log("=".repeat(60));
  console.log("YouTube Transcript Fetcher Test");
  console.log("=".repeat(60));
  console.log(`\nTest video: ${TEST_VIDEO_URL}\n`);

  const transcript = await getVideoTranscript(TEST_VIDEO_URL);

  console.log("\n" + "=".repeat(60));
  if (transcript) {
    console.log("✅ SUCCESS: Transcript fetched!");
    console.log(`Length: ${transcript.length} characters`);
    console.log("\nFirst 500 characters:");
    console.log("-".repeat(40));
    console.log(transcript.substring(0, 500));
    console.log("-".repeat(40));
  } else {
    console.log("❌ TEST FAILED: Could not fetch transcript");
    process.exit(1);
  }
}

main();
