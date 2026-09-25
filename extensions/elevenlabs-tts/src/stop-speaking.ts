import { showHUD } from "@raycast/api";
import { isSpeechSessionActive, stopActivePlayback, StopResult } from "./audio/playback";

// How long to wait for a speak command that is still connecting to start its player
const STARTUP_WAIT_MS = 5_000;
const STARTUP_POLL_MS = 250;

async function stopPlayback(): Promise<StopResult | "starting"> {
  const deadline = Date.now() + STARTUP_WAIT_MS;
  let result = await stopActivePlayback();

  // A speak command holds its session before the first audio chunk arrives,
  // so wait for its player to start instead of reporting that nothing is playing
  while (result === "not-playing" && (await isSpeechSessionActive())) {
    if (Date.now() >= deadline) return "starting";
    await new Promise((resolve) => setTimeout(resolve, STARTUP_POLL_MS));
    result = await stopActivePlayback();
  }

  return result;
}

const messages: Record<StopResult | "starting", string> = {
  stopped: "⏹️ Stopped",
  "not-playing": "Nothing is playing",
  failed: "⚠️ Couldn't stop playback",
  starting: "⏳ Speech is still starting, try again",
};

export default async function Command() {
  let result: StopResult | "starting";
  try {
    result = await stopPlayback();
  } catch (error) {
    console.error("Stop error:", error);
    result = "failed";
  }
  await showHUD(messages[result]);
}
