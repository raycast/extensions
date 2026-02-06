import { List, ActionPanel, Action, Icon, getApplications } from "@raycast/api";
import { useSQL, usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { homedir } from "os";
import { resolve } from "path";
import { Transcript } from "./types";
import {
  getAppName,
  getDisplayText,
  parseTimestamp,
  formatTimestamp,
  formatDuration,
  groupTranscriptsByDate,
  getUniqueApps,
} from "./utils";

const WISPR_DB = resolve(
  homedir(),
  "Library/Application Support/Wispr Flow/flow.sqlite",
);

const COLUMNS = `transcriptEntityId, asrText, formattedText, editedText,
  timestamp, app, url, duration, numWords, status, language, conversationId, isArchived`;

function buildQuery(search: string) {
  if (search.trim()) {
    const escaped = search.replace(/'/g, "''");
    const pattern = `%${escaped}%`;
    return `SELECT ${COLUMNS} FROM History
      WHERE (isArchived = 0 OR isArchived IS NULL)
        AND (formattedText LIKE '${pattern}' OR asrText LIKE '${pattern}' OR editedText LIKE '${pattern}')
      ORDER BY timestamp DESC LIMIT 100`;
  }
  return `SELECT ${COLUMNS} FROM History
    WHERE (isArchived = 0 OR isArchived IS NULL)
      AND formattedText IS NOT NULL AND formattedText != ''
    ORDER BY timestamp DESC LIMIT 200`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [appFilter, setAppFilter] = useState("all");

  const query = useMemo(() => buildQuery(searchText), [searchText]);
  const { data, isLoading, permissionView } = useSQL<Transcript>(
    WISPR_DB,
    query,
    {
      permissionPriming:
        "This is required to read your Wispr Flow transcription history.",
    },
  );

  if (permissionView) {
    return permissionView;
  }

  const { data: installedApps } = usePromise(getApplications);
  const appPathMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of installedApps ?? []) {
      if (app.bundleId) {
        map.set(app.bundleId, app.path);
      }
    }
    return map;
  }, [installedApps]);

  const allTranscripts = data ?? [];
  const filtered =
    appFilter === "all"
      ? allTranscripts
      : allTranscripts.filter((t) => t.app === appFilter);
  const groups = groupTranscriptsByDate(filtered);
  const uniqueApps = getUniqueApps(allTranscripts);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search transcripts..."
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by App" onChange={setAppFilter}>
          <List.Dropdown.Item title="All Apps" value="all" />
          <List.Dropdown.Section title="Apps">
            {uniqueApps.map((app) => (
              <List.Dropdown.Item
                key={app.bundleId}
                title={app.name}
                value={app.bundleId}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {groups.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.transcripts.map((transcript) => (
            <TranscriptListItem
              key={transcript.transcriptEntityId}
              transcript={transcript}
              appPathMap={appPathMap}
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && filtered.length === 0 && (
        <List.EmptyView
          title="No Transcripts Found"
          description={
            searchText
              ? "Try a different search term"
              : "Start dictating with Wispr Flow to see transcripts here"
          }
          icon={Icon.Microphone}
        />
      )}
    </List>
  );
}

function TranscriptListItem({
  transcript,
  appPathMap,
}: {
  transcript: Transcript;
  appPathMap: Map<string, string>;
}) {
  const displayText = getDisplayText(transcript);
  const appName = getAppName(transcript.app);
  const date = parseTimestamp(transcript.timestamp);
  const timeLabel = formatTimestamp(date);
  const duration = formatDuration(transcript.duration);

  const truncatedTitle =
    displayText.length > 80
      ? displayText.substring(0, 80) + "..."
      : displayText;
  const appPath = transcript.app ? appPathMap.get(transcript.app) : undefined;
  const appIcon = appPath ? { fileIcon: appPath } : Icon.Microphone;

  return (
    <List.Item
      icon={appIcon}
      title={truncatedTitle}
      accessories={[{ text: timeLabel, tooltip: date.toLocaleString() }]}
      detail={
        <List.Item.Detail
          markdown={displayText}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Information" />
              <List.Item.Detail.Metadata.Label
                title="Source"
                text={appName}
                icon={appIcon}
              />
              <List.Item.Detail.Metadata.Label
                title="Content type"
                text="Text"
              />
              {transcript.numWords ? (
                <List.Item.Detail.Metadata.Label
                  title="Words"
                  text={String(transcript.numWords)}
                />
              ) : null}
              {duration ? (
                <List.Item.Detail.Metadata.Label
                  title="Duration"
                  text={duration}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Dictated"
                text={date.toLocaleString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              content={displayText}
            />
            <Action.Paste title="Paste to Active App" content={displayText} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Transcript ID"
              content={transcript.transcriptEntityId}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
