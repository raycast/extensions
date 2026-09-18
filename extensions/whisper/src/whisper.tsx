import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { copyConcealed, createSecret, formatDuration, getDefaults, parseDuration } from "./shared";

const USE_DEFAULT = "default";

/** Returns the argument only when it is a real override, not the "use my default" sentinel. */
function override(value: string | undefined): string | undefined {
  return value && value !== USE_DEFAULT ? value : undefined;
}

// Argument types come from `Arguments.Whisper`, generated from package.json,
// so they cannot drift from the manifest.
export default async function main(props: LaunchProps<{ arguments: Arguments.Whisper }>) {
  const secret = props.arguments.secret;

  if (!secret.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Secret cannot be empty" });
    return;
  }

  const defaults = getDefaults();
  // Raycast remembers dropdown arguments between launches, so an explicit
  // "Use my default" entry keeps a stale choice from silently overriding the
  // preferences. Anything else is a deliberate one-off override.
  const durationArg = override(props.arguments.duration);
  const selfDestructArg = override(props.arguments.selfDestruct);
  const durationSeconds = (durationArg && parseDuration(durationArg)) || defaults.durationSeconds;
  const selfDestruct = selfDestructArg ? selfDestructArg === "true" : defaults.selfDestruct;

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
