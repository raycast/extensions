import { Detail, closeMainWindow, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { PushDetailView } from "./components/push-detail";
import { getSharedClient } from "./lib/client";
import { ensureSignedIn } from "./lib/oauth";
import { isFileItem, isUrlItem, latestPushFast } from "./lib/push-items";

export default function Command() {
  const didOpenRef = useRef(false);
  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const session = await ensureSignedIn();
    if (!session) return null;
    return latestPushFast();
  }, []);

  useEffect(() => {
    const item = data?.item;
    if (!item || didOpenRef.current) return;

    if (data.stale) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Opened Cached Latest Push",
        message:
          data.staleReason === "error" ? "Refresh failed; used cached push." : "Refresh timed out; used cached push.",
      });
    }

    if (!isUrlItem(item) && !isFileItem(item)) return;

    didOpenRef.current = true;
    void (async () => {
      try {
        await closeMainWindow();
        if (isUrlItem(item)) {
          await open(item.content);
          return;
        }
        const blob = await getSharedClient().getStoredBlob(item.id);
        if (!blob?.path) {
          throw new Error("Latest push file is unavailable.");
        }
        await open(blob.path);
      } catch (error) {
        didOpenRef.current = false;
        await showToast({
          style: Toast.Style.Failure,
          title: "Open Failed",
          message: error instanceof Error ? error.message : String(error),
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: openExtensionPreferences,
          },
        });
      }
    })();
  }, [data]);

  if (!data?.item) {
    return (
      <Detail
        isLoading={isLoading}
        markdown="# No pushes yet\n\nSend something from Nibit Web or Android to see it here."
      />
    );
  }

  if (isUrlItem(data.item) || isFileItem(data.item)) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# Opening ${isUrlItem(data.item) ? "Latest URL" : "Latest File"}\n\n${
          data.item.title ?? data.item.content
        }`}
      />
    );
  }

  return <PushDetailView item={data.item} onRefresh={async () => void (await mutate())} />;
}
