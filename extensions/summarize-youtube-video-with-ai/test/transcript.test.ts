/**
 * Diagnostic script for YouTube transcript fetching.
 * Run with: npm run check:youtube-api
 *
 * Use this to verify transcript extraction still works when YouTube changes its internal API.
 */

import ytdl from "ytdl-core";
import { fetchTranscript } from "../src/utils/transcriptFetcher";

const TEST_VIDEO_URL = "https://youtu.be/AJpK3YTTKZ4";

async function main() {
  console.log("=".repeat(60));
  console.log("YouTube Transcript Fetcher Test");
  console.log("=".repeat(60));
  console.log(`\nTest video: ${TEST_VIDEO_URL}`);
  console.log(`Video ID: ${ytdl.getVideoID(TEST_VIDEO_URL)}\n`);

  try {
    console.log("[1/2] Fetching transcript...");
    const transcript = await fetchTranscript(TEST_VIDEO_URL);

    console.log("[2/2] Parsing complete\n");
    console.log("=".repeat(60));
    console.log("SUCCESS: Transcript fetched!");
    console.log(`Length: ${transcript.length} characters`);
    console.log("\nFirst 500 characters:");
    console.log("-".repeat(40));
    console.log(transcript.substring(0, 500));
    console.log("-".repeat(40));
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log(`FAILED: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
