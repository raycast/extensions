import { showToast, Toast } from "@raycast/api";
import { ensureSignedIn } from "./lib/oauth";
import { copyLatestPush } from "./lib/actions";

export default async function command() {
  const session = await ensureSignedIn();
  if (!session) return;
  try {
    const resolution = await copyLatestPush();
    if (resolution.stale) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Copied cached latest push",
        message:
          resolution.staleReason === "error"
            ? "Refresh failed; used cached push."
            : "Refresh timed out; used cached push.",
      });
    } else {
      await showToast({ style: Toast.Style.Success, title: "Copied latest push" });
    }
    // Keep the process alive until the sync finishes so the cache is warm next time.
    await resolution.backgroundSync;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Copy failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
