import { open, showToast, Toast } from "@raycast/api";
import { getBrowserLink, getBrowserPageTitle } from "./hooks/useBrowserLink";

export default async function Command() {
  try {
    const url = await getBrowserLink();
    const title = await getBrowserPageTitle();
    if (title) {
      await open(`tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`);
    } else {
      await open(`tg://msg_url?url=${encodeURIComponent(url)}`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to share page",
      message: String(error),
    });
  }
}
