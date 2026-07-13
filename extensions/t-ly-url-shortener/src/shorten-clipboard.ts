import { Clipboard, Toast, open, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { shortenUrl } from "./api";

export default async function Command() {
  try {
    const longUrl = await Clipboard.readText();
    if (!longUrl) throw new Error("Copy a URL to the clipboard first.");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Shortening clipboard URL",
    });
    const result = await shortenUrl({ longUrl });

    await Clipboard.copy(result.short_url);
    toast.style = Toast.Style.Success;
    toast.title = "Short link copied";
    toast.message = result.short_url;
    toast.primaryAction = {
      title: "Open Short Link",
      onAction: () => open(result.short_url),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could not shorten clipboard URL" });
  }
}
