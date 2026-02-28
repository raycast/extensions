import { useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useTldvData } from "./utils/useTldvData";
import { getRecordingSubtitle, getRecordingAccessories } from "./utils/formatters";
import { Recording } from "./types";
import { ERROR_MESSAGES, UI_CONSTANTS } from "./constants";

interface Preferences {
  apiKey: string;
}

export default function RecentRecordings() {
  const preferences = getPreferenceValues<Preferences>();
  const { recordings, isLoading, error, hasMore, loadMore, refresh } = useTldvData();

  useEffect(() => {
    if (!preferences.apiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: ERROR_MESSAGES.API_KEY_REQUIRED,
        message: ERROR_MESSAGES.API_KEY_MISSING,
      });
    }
  }, [preferences.apiKey]);

  const handleOpenRecording = (recording: Recording) => {
    if (recording?.url) {
      return <Action.OpenInBrowser title="Open in Tl;dv" url={recording.url} />;
    }
    return null;
  };

  const handleCopyLink = (recording: Recording) => {
    if (recording?.url) {
      return (
        <Action.CopyToClipboard title="Copy Link" content={recording.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      );
    }
    return null;
  };

  const handleShowDetails = (recording: Recording) => {
    const details = [];

    const truncatedTitle =
      recording?.title?.length > UI_CONSTANTS.MAX_TITLE_LENGTH
        ? recording.title.substring(0, UI_CONSTANTS.MAX_TITLE_LENGTH) + "..."
        : recording?.title || "Untitled";

    details.push(`# ${truncatedTitle}`);
    details.push("");

    if (recording?.description) {
      const truncatedDesc =
        recording.description.length > UI_CONSTANTS.MAX_DESCRIPTION_LENGTH
          ? recording.description.substring(0, UI_CONSTANTS.MAX_DESCRIPTION_LENGTH) + "..."
          : recording.description;
      details.push("## Description");
      details.push(truncatedDesc);
      details.push("");
    }

    details.push("## Details");
    if (recording?.meetingType) {
      details.push(
        `- **Meeting Type**: ${recording.meetingType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
      );
    }
    if (recording?.duration) {
      details.push(`- **Duration**: ${Math.floor(recording.duration / 60)} minutes`);
    }
    if (recording?.createdAt) {
      details.push(`- **Date**: ${new Date(recording.createdAt).toLocaleString()}`);
    }
    if (recording?.status) {
      details.push(`- **Status**: ${recording.status}`);
    }

    if (recording?.participants && Array.isArray(recording.participants) && recording.participants.length > 0) {
      details.push("");
      details.push("## Participants");
      recording.participants.forEach((p) => p && details.push(`- ${p}`));
    }

    if (recording?.tags && Array.isArray(recording.tags) && recording.tags.length > 0) {
      details.push("");
      details.push("## Tags");
      details.push(
        recording.tags
          .filter((t) => t)
          .map((t) => `#${t}`)
          .join(" "),
      );
    }

    if (recording?.summary?.text) {
      details.push("");
      details.push("## Summary");
      details.push(recording.summary.text);

      if (
        recording.summary?.keyPoints &&
        Array.isArray(recording.summary.keyPoints) &&
        recording.summary.keyPoints.length > 0
      ) {
        details.push("");
        details.push("### Key Points");
        recording.summary.keyPoints.forEach((point) => point && details.push(`- ${point}`));
      }

      if (
        recording.summary?.actionItems &&
        Array.isArray(recording.summary.actionItems) &&
        recording.summary.actionItems.length > 0
      ) {
        details.push("");
        details.push("### Action Items");
        recording.summary.actionItems.forEach((item) => {
          if (item?.text) {
            let itemText = `- ${item.text}`;
            if (item.assignee) itemText += ` (assigned to: ${item.assignee})`;
            if (item.dueDate) itemText += ` [due: ${item.dueDate}]`;
            details.push(itemText);
          }
        });
      }

      if (
        recording.summary?.decisions &&
        Array.isArray(recording.summary.decisions) &&
        recording.summary.decisions.length > 0
      ) {
        details.push("");
        details.push("### Decisions");
        recording.summary.decisions.forEach((decision) => decision && details.push(`- ${decision}`));
      }
    }

    if (recording?.highlights && Array.isArray(recording.highlights) && recording.highlights.length > 0) {
      details.push("");
      details.push("## Highlights");
      recording.highlights.forEach((highlight) => {
        if (highlight?.text) {
          details.push(`- ${highlight.text}`);
          if (highlight.speaker) {
            details.push(`  *— ${highlight.speaker}*`);
          }
        }
      });
    }

    return (
      <Action.Push
        title="Show Details"
        icon={Icon.Info}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        target={
          <List navigationTitle={recording.title}>
            <List.Item
              title="Recording Details"
              subtitle={getRecordingSubtitle(recording)}
              detail={<List.Item.Detail markdown={details.join("\n")} />}
            />
          </List>
        }
      />
    );
  };

  const groupRecordingsByDate = (recordings: Recording[]) => {
    const groups: { [key: string]: Recording[] } = {};

    // Safety check for undefined or null recordings
    if (!recordings || !Array.isArray(recordings)) {
      return groups;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    recordings.forEach((recording) => {
      const recordingDate = new Date(recording.createdAt);
      let groupKey: string;

      if (recordingDate.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (recordingDate.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (recordingDate > thisWeek) {
        groupKey = "This Week";
      } else {
        const month = recordingDate.toLocaleString("default", { month: "long" });
        const year = recordingDate.getFullYear();
        groupKey = `${month} ${year}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(recording);
    });

    return groups;
  };

  const safeRecordings = recordings || [];
  const groupedRecordings = groupRecordingsByDate(safeRecordings);
  const groupKeys = ["Today", "Yesterday", "This Week"];
  const otherKeys = Object.keys(groupedRecordings)
    .filter((key) => !groupKeys.includes(key))
    .sort((a, b) => {
      const dateA = new Date(groupedRecordings[a]?.[0]?.createdAt || 0);
      const dateB = new Date(groupedRecordings[b]?.[0]?.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  const allKeys = [...groupKeys.filter((key) => groupedRecordings[key]), ...otherKeys];

  return (
    <List isLoading={isLoading} navigationTitle="Recent Recordings" searchBarPlaceholder="Filter recordings...">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Recordings"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refresh} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : safeRecordings.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.VideoCamera} title="No Recordings" description="You don't have any recordings yet" />
      ) : (
        <>
          {allKeys.map((groupKey) => (
            <List.Section key={groupKey} title={groupKey}>
              {groupedRecordings[groupKey].map((recording) => (
                <List.Item
                  key={recording.id}
                  title={recording.title}
                  subtitle={recording.description || getRecordingSubtitle(recording)}
                  accessories={getRecordingAccessories(recording)}
                  keywords={[
                    ...(Array.isArray(recording.tags) ? recording.tags : []),
                    ...(Array.isArray(recording.participants) ? recording.participants : []),
                    recording.meetingType,
                  ].filter(Boolean)}
                  actions={
                    <ActionPanel>
                      {handleOpenRecording(recording)}
                      {handleShowDetails(recording)}
                      {handleCopyLink(recording)}
                      <Action.CopyToClipboard
                        title="Copy Title"
                        content={recording.title}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      {recording.summary && (
                        <Action.CopyToClipboard
                          title="Copy Summary"
                          content={recording.summary.text}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        />
                      )}
                      <Action
                        title="Refresh"
                        onAction={refresh}
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))}
          {hasMore && (
            <List.Item
              title="Load More Recordings"
              subtitle="Press Enter to load more recordings"
              icon={Icon.ChevronDown}
              actions={
                <ActionPanel>
                  <Action title="Load More" onAction={loadMore} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
