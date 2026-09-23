import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { copyConcealed, createSecret, formatDuration, getDefaults } from "./shared";

// Argument types come from `Arguments.Whisper`, generated from package.json,
// so they cannot drift from the manifest.
export default async function main(props: LaunchProps<{ arguments: Arguments.Whisper }>) {
  const secret = props.arguments.secret;

  if (!secret.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
    return;
  }

  // Expiration and self-destruct come from preferences only. Raycast remembers
  // command arguments between launches, so a dropdown here would keep sending a
  // stale choice long after the user changed their defaults.
  const { durationSeconds, selfDestruct } = getDefaults();

  try {
    await showToast({ style: Toast.Style.Animated, title: "Encrypting secret..." });
    const expirationTimestamp = Math.floor(Date.now() / 1000) + durationSeconds;
    const shareUrl = await createSecret(secret, expirationTimestamp, selfDestruct);
    await copyConcealed(shareUrl);

    const durationDisplay = formatDuration(durationSeconds);
    const destructNote = selfDestruct ? "Self-destructs after first view." : "Can be viewed multiple times.";

    await showHUD(`Copied! Expires in ${durationDisplay}. ${destructNote}`);
  } catch (error) {
    console.error("Failed to create secret:", error);
    const message = error instanceof Error ? error.message : "Please try again.";
    await showToast({ style: Toast.Style.Failure, title: "Failed to create secret", message });
  }
}
