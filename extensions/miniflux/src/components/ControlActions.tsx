/* eslint-disable @raycast/prefer-title-case */
import { useCallback } from "react";
import { ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import apiServer from "../utils/api";
import { MinifluxEntry, MinifluxApiError, ReadwiseError } from "../utils/types";
import FeedInDetail from "./FeedInDetail";
import { useErrorHandler } from "../utils/useErrorHandler";

const ControlActions = ({
  entry,
  onRefresh,
  entries,
}: {
  entry: MinifluxEntry;
  onRefresh?: () => Promise<void>;
  entries?: MinifluxEntry[];
}) => {
  const handleError = useErrorHandler();

  const handleBookmarked = useCallback(
    async (entry: MinifluxEntry): Promise<void> => {
      try {
        showToast(Toast.Style.Animated, `Marking entry as ${entry.starred ? "unstarred" : "starred"}...`);
        await apiServer.toggleBookmark(entry);
        showToast(Toast.Style.Success, `The entry has been ${entry.starred ? "unstarred" : "starred"}`);
      } catch (error) {
        showToast(Toast.Style.Failure, `Failed to ${entry.starred ? "unstar" : "star"} the entry`);
      }
    },
    [entry]
  );

  const handleMarkAsRead = useCallback(
    async (entry: MinifluxEntry): Promise<void> => {
      try {
        showToast(Toast.Style.Animated, "Marking entry as read...");
        await apiServer.updateEntry(entry.id, "read");
        showToast(Toast.Style.Success, "Marked as read");
        if (onRefresh) await onRefresh();
      } catch (error) {
        handleError(error as MinifluxApiError);
      }
    },
    [entry, onRefresh]
  );

  const handleMarkPageAsRead = useCallback(
    async (entries: MinifluxEntry[]): Promise<void> => {
      const entryIDs = entries.map((entry) => entry.id);

      try {
        showToast(Toast.Style.Animated, "Marking entries as read...");
        await apiServer.updateEntries(entryIDs, "read");
        showToast(Toast.Style.Success, "Marked as read");
        if (onRefresh) await onRefresh();
      } catch (error) {
        handleError(error as MinifluxApiError);
      }
    },
    [entries, onRefresh]
  );

  const handleRefresh = useCallback(async () => {
    try {
      showToast(Toast.Style.Animated, "Refreshing all feeds...");
      await apiServer.refreshAllFeed();
      showToast(Toast.Style.Success, "Feeds have been refreshed");
    } catch (error) {
      handleError(error as MinifluxApiError);
    }
  }, []);

  const saveToReadwise = useCallback(
    async ({ url }: MinifluxEntry) => {
      try {
        showToast(Toast.Style.Animated, "Saving to Readwise Reader...");
        await apiServer.saveToReadwise({ url });
        showToast(Toast.Style.Success, "Saved");
      } catch (error) {
        const newError = error as ReadwiseError;
        showToast(Toast.Style.Failure, newError.detail);
      }
    },
    [entry]
  );

  return (
    <ActionPanel title={entry.title}>
      <Action.OpenInBrowser url={entry.url} title="Open in Browser with Original URL" />
      <Action.Push title="Read the Original Content" target={<FeedInDetail entry={entry} />} icon={Icon.Glasses} />
      <Action
        onAction={() => handleMarkAsRead(entry)}
        title={"Mark as Read"}
        icon={Icon.Checkmark}
        shortcut={{ modifiers: ["opt"], key: "m" }}
      />
      {entries && (
        <Action
          onAction={() => handleMarkPageAsRead(entries)}
          title={"Mark Page as Read"}
          icon={Icon.CheckCircle}
          shortcut={{ modifiers: ["opt", "shift"], key: "m" }}
        />
      )}
      <Action
        onAction={() => handleBookmarked(entry)}
        title={`${entry.starred ? "Unstar" : "Star"}`}
        icon={entry.starred ? Icon.StarDisabled : Icon.Star}
        shortcut={{ modifiers: ["opt"], key: "s" }}
      />
      <Action
        onAction={() => saveToReadwise(entry)}
        title={"Save To Readwise Reader"}
        icon={{ source: "reader-logo.png" }}
        shortcut={{ modifiers: ["opt"], key: "r" }}
      />
      <Action.OpenInBrowser
        title="Open in Miniflux"
        shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
        url={apiServer.getEntryUrlInMiniflux(entry)}
        icon={{ source: "miniflux-icon.png" }}
      />
      <Action onAction={handleRefresh} title={"Refresh All Feeds"} icon={Icon.RotateClockwise} />
    </ActionPanel>
  );
};

export default ControlActions;
