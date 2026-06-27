import { showToast, Toast, Clipboard, LaunchProps } from "@raycast/api";
import { wakeAndCast } from "./hass";

interface Arguments {
  url?: string;
}

function isYoutubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url.trim());
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  let url = props.arguments?.url?.trim();
  if (!url) {
    const clip = await Clipboard.readText();
    if (clip) url = clip.trim();
  }

  if (!url) {
    await showToast(Toast.Style.Failure, "No YouTube URL");
    return;
  }
  if (!isYoutubeUrl(url)) {
    await showToast(Toast.Style.Failure, "Not a YouTube URL");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Casting to Fire TV…");

  try {
    await wakeAndCast(toast, `am start -a android.intent.action.VIEW -d "${url}" org.smarttube.stable`);
    toast.style = Toast.Style.Success;
    toast.title = "▶ Casting YouTube";
    toast.message = url.length > 70 ? url.slice(0, 67) + "…" : url;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}
