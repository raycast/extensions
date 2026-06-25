import { Clipboard, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { glimpse } from "./glimpse";

const SUPPORTED = ["wav", "mp3", "m4a", "aac", "ogg", "flac", "mp4", "mov", "webm", "mkv"];

export default async function Command() {
  let items;
  try {
    items = await getSelectedFinderItems();
  } catch {
    // Finder isn't frontmost, or nothing is selected.
    await showHUD("Choose an audio or video file in Finder");
    return;
  }

  const file = items.find((item) => SUPPORTED.includes(extensionOf(item.path)));
  if (!file) {
    await showHUD("Choose an audio or video file in Finder");
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…" });
  try {
    const res = await glimpse<{ files: { text: string }[] }>(["transcribe", file.path, "--stdout"]);
    await Clipboard.copy(res.files?.[0]?.text ?? "");
    toast.style = Toast.Style.Success;
    toast.title = "Transcript copied";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Glimpse";
    toast.message = (error as Error).message;
  }
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}
