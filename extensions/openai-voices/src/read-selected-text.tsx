import { Clipboard, closeMainWindow, getPreferenceValues, getSelectedText, showToast, Toast } from "@raycast/api";
import { play } from "./play";
import { createSpeech } from "./tts-utils";
import { Preferences } from "./types";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.openaiApiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not configured",
      message: "Please configure your OpenAI API key first.",
    });
    return;
  }

  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    const clipboardText = await Clipboard.readText();
    text = clipboardText ?? "";
  }

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
  });

  try {
    await closeMainWindow();

    const { audio, format } = await createSpeech(text);
    await play(audio, format);

    toast.style = Toast.Style.Success;
    toast.title = "Finished reading";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to generate speech";
    toast.message = err instanceof Error ? err.message : "Unknown error";
  }
}
