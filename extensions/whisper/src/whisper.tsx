import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { copyConcealed, createSecret, formatDuration, getDefaults, parseDuration } from "./shared";

interface Arguments {
  secret: string;
  duration?: string;
  selfDestruct?: string;
}

export default async function main(props: LaunchProps<{ arguments: Arguments }>) {
  const secret = props.arguments.secret;

  if (!secret.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
    return;
  }

  const defaults = getDefaults();
  const durationSeconds =
    (props.arguments.duration && parseDuration(props.arguments.duration)) || defaults.durationSeconds;
  const selfDestruct = props.arguments.selfDestruct ? props.arguments.selfDestruct === "true" : defaults.selfDestruct;

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
