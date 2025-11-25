import { showToast, Toast, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchCreateBookmark } from "./apis";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { Bookmark } from "./types";

export default async function QuickBookmark() {
  try {
    // Show initial toast
    const toast = await showToast({
      title: "Getting browser URL...",
      style: Toast.Style.Animated,
    });

    // Get the current browser URL
    const url = await getBrowserLink();

    if (!url) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to get browser URL";
      toast.message = "Make sure a browser is open with an active tab";
      return;
    }

    toast.title = "Creating bookmark...";

    // Create the bookmark
    const payload = {
      type: "link",
      url: url,
      createdAt: new Date().toISOString(),
    };

    const bookmark = (await fetchCreateBookmark(payload)) as Bookmark;

    if (!bookmark) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create bookmark";
      return;
    }

    await showHUD("✓ Bookmark created");
  } catch (error) {
    await showFailureToast({
      title: "Failed to create quick bookmark",
      message: String(error),
    });
  }
}
