import { Clipboard, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { createSecret, formatDuration, parseDuration } from "./shared";

const DEFAULT_DURATION_SECONDS = 3600; // 1 hour

function parseCommand(text: string): { secret: string; durationSeconds: number; selfDestruct: boolean } {
  const tokens = text.trim().split(/\s+/);
  let selfDestruct = true;
  let durationSeconds = DEFAULT_DURATION_SECONDS;
  let end = tokens.length;

  if (end > 1 && tokens[end - 1].toLowerCase() === "false") {
    selfDestruct = false;
    end--;
  }

  if (end > 1) {
    const parsed = parseDuration(tokens[end - 1]);
    if (parsed) {
      durationSeconds = parsed;
      end--;
    }
  }

  const secret = tokens.slice(0, end).join(" ");
  return { secret, durationSeconds, selfDestruct };
}

export default async function main(props: LaunchProps<{ arguments: { text: string } }>) {
  const input = props.arguments.text.trim();

  if (!input) {
    await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
    return;
  }

  const { secret, durationSeconds, selfDestruct } = parseCommand(input);

  try {
    await showToast({ style: Toast.Style.Animated, title: "Creating secret..." });
    const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;
    const shareUrl = await createSecret(secret, expirationTimestamp, selfDestruct);
    await Clipboard.copy(shareUrl);

    const durationDisplay = formatDuration(durationSeconds);
    const destructNote = selfDestruct ? "Self-destructs after first view." : "Can be viewed multiple times.";

    await showHUD(`Copied! Expires in ${durationDisplay}. ${destructNote}`);
  } catch (error) {
    console.error("Failed to create secret:", error);
    const message = error instanceof Error ? error.message : "Please try again.";
    await showToast({ style: Toast.Style.Failure, title: "Failed to create secret", message });
  }
}
