import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { speakText } from "./speak";
import { getSelectedTextOrClipboard } from "./text-source";
import { getConfigError } from "./tts-utils";
import { Preferences } from "./types";

function getCompletionTitle(completion: "finished" | "stopped", engine?: string): string {
  if (completion === "stopped") {
    return engine ? `Reading interrupted (${engine})` : "Reading interrupted";
  }

  return engine ? `Finished reading (${engine})` : "Finished reading";
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const configError = getConfigError(preferences);
  if (configError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not configured",
      message: configError,
    });
    return;
  }

  const { text, source } = await getSelectedTextOrClipboard();

  if (!text.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text found",
      message: "No text selected or in clipboard.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating speech…",
    message: source === "clipboard" ? "Using clipboard text" : undefined,
  });

  try {
    await closeMainWindow();

    const { warnings, completion, engine } = await speakText(text);

    toast.style = Toast.Style.Success;
    toast.title = getCompletionTitle(completion, engine);
    toast.message = warnings.length > 0 ? warnings.join("; ") : undefined;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to generate speech";
    toast.message = err instanceof Error ? err.message : "Unknown error";
  }
}
