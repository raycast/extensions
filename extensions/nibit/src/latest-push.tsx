import { Detail, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback } from "react";
import { ensureSignedIn } from "./lib/oauth";
import { latestPushFast } from "./lib/push-items";
import { PushDetailView } from "./components/push-detail";

export default function Command() {
  const loadLatest = useCallback(async () => {
    const session = await ensureSignedIn();
    if (!session) return null;
    const resolution = await latestPushFast();
    if (resolution.stale) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Showing cached latest push",
        message:
          resolution.staleReason === "error"
            ? "Refresh failed; used cached push."
            : "Refresh timed out; used cached push.",
      });
    }
    return resolution.item;
  }, []);

  const { data: item, isLoading, mutate } = useCachedPromise(loadLatest, []);

  if (!item) {
    return (
      <Detail
        isLoading={isLoading}
        markdown="# No pushes yet\n\nSend something from Nibit Web or Android to see it here."
      />
    );
  }

  return <PushDetailView item={item} onRefresh={async () => void (await mutate())} />;
}
