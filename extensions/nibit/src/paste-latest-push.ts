import { showToast, Toast } from "@raycast/api";
import { ensureSignedIn } from "./lib/oauth";
import { pasteLatestPush } from "./lib/actions";

export default async function command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Pasting latest push...",
  });

  const session = await ensureSignedIn();
  if (!session) {
    await toast.hide();
    return;
  }

  try {
    const resolution = await pasteLatestPush();
    if (resolution.stale) {
      toast.style = Toast.Style.Failure;
      toast.title = "Pasted cached latest push";
      toast.message =
        resolution.staleReason === "error"
          ? "Refresh failed; used cached push."
          : "Refresh timed out; used cached push.";
    } else {
      await toast.hide();
    }
    // Keep the process alive until the sync finishes so the cache is warm next time.
    await resolution.backgroundSync;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Paste failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
