import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  Toast,
  showToast,
  confirmAlert,
  Alert,
  getApplications,
} from "@raycast/api";
import { useCachedPromise, usePromise, executeSQL } from "@raycast/utils";
import { useState, useMemo, useCallback } from "react";
import { homedir } from "os";
import { resolve } from "path";
import { Transcript } from "./types";
import {
  getAppName,
  getDisplayText,
  parseTimestamp,
  formatDuration,
  groupTranscriptsByDate,
} from "./utils";

const WISPR_DB = resolve(
  homedir(),
  "Library/Application Support/Wispr Flow/flow.sqlite",
);

const COLUMNS = `transcriptEntityId, asrText, formattedText, editedText,
  timestamp, app, url, duration, numWords, status, language, conversationId, isArchived`;

const PAGE_SIZE = 50;

function buildPaginatedQuery(
  search: string,
  appFilter: string,
  limit: number,
  offset: number,
) {
  const conditions = ["(isArchived = 0 OR isArchived IS NULL)"];

  if (search.trim()) {
    const escaped = search.replace(/'/g, "''");
    const pattern = `%${escaped}%`;
    conditions.push(
      `(formattedText LIKE '${pattern}' OR asrText LIKE '${pattern}' OR editedText LIKE '${pattern}')`,
    );
  } else {
    conditions.push("formattedText IS NOT NULL AND formattedText != ''");
  }

  if (appFilter !== "all") {
    const escaped = appFilter.replace(/'/g, "''");
    conditions.push(`app = '${escaped}'`);
  }

  return `SELECT ${COLUMNS} FROM History WHERE ${conditions.join(" AND ")} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [appFilter, setAppFilter] = useState("all");

  const { isLoading, data, pagination, revalidate } = useCachedPromise(
    (search: string, app: string) => async (options: { page: number }) => {
      const offset = options.page * PAGE_SIZE;
      const query = buildPaginatedQuery(search, app, PAGE_SIZE, offset);
      const results = await executeSQL<Transcript>(WISPR_DB, query);
      return { data: results, hasMore: results.length === PAGE_SIZE };
    },
    [searchText, appFilter],
  );

  const { data: uniqueAppsData } = useCachedPromise(async () => {
    return executeSQL<{ app: string }>(
      WISPR_DB,
      `SELECT DISTINCT app FROM History WHERE (isArchived = 0 OR isArchived IS NULL) AND app IS NOT NULL AND app != '' ORDER BY app`,
    );
  }, []);

  const uniqueApps = useMemo(() => {
    return (uniqueAppsData ?? [])
      .map((row) => ({ bundleId: row.app, name: getAppName(row.app) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [uniqueAppsData]);

  const { data: installedApps } = usePromise(getApplications);
  const appPathMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of installedApps ?? []) {
      if (app.bundleId) {
        map.set(app.bundleId, app.path);
      }
    }
    // Map legacy bundle IDs to current app paths
    const BUNDLE_ALIASES: Record<string, string> = {
      "com.arc.Arc": "company.thebrowser.Browser",
    };
    for (const [oldId, newId] of Object.entries(BUNDLE_ALIASES)) {
      if (!map.has(oldId) && map.has(newId)) {
        map.set(oldId, map.get(newId)!);
      }
    }
    return map;
  }, [installedApps]);

  const allTranscripts = data ?? [];
  const groups = groupTranscriptsByDate(allTranscripts);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search transcripts..."
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail
      pagination={pagination}
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
              onArchive={revalidate}
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && allTranscripts.length === 0 && (
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
  onArchive,
}: {
  transcript: Transcript;
  appPathMap: Map<string, string>;
  onArchive: () => void;
}) {
  const displayText = getDisplayText(transcript);
  const appName = getAppName(transcript.app);
  const date = parseTimestamp(transcript.timestamp);
  const duration = formatDuration(transcript.duration);

  const truncatedTitle =
    displayText.length > 80
      ? displayText.substring(0, 80) + "..."
      : displayText;
  const appPath = transcript.app ? appPathMap.get(transcript.app) : undefined;
  const appIcon = appPath ? { fileIcon: appPath } : Icon.Microphone;

  const handleArchive = useCallback(async () => {
    if (
      await confirmAlert({
        title: "Archive Transcript",
        message: "Are you sure you want to archive this transcript?",
        primaryAction: {
          title: "Archive",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const escaped = transcript.transcriptEntityId.replace(/'/g, "''");
      await executeSQL(
        WISPR_DB,
        `UPDATE History SET isArchived = 1 WHERE transcriptEntityId = '${escaped}'`,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Transcript archived",
      });
      onArchive();
    }
  }, [transcript.transcriptEntityId, onArchive]);

  const wisprFlowPath = appPathMap.get("com.electron.wispr-flow");
  const hasOriginalText =
    transcript.asrText && transcript.asrText !== displayText;

  return (
    <List.Item
      icon={appIcon}
      title={truncatedTitle}
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
              {transcript.numWords && transcript.duration ? (
                <List.Item.Detail.Metadata.Label
                  title="WPM"
                  text={String(
                    Math.round(
                      transcript.numWords / (transcript.duration / 60),
                    ),
                  )}
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
            {hasOriginalText ? (
              <Action.Push
                title="View Original Transcription"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                target={
                  <Detail
                    markdown={transcript.asrText ?? ""}
                    navigationTitle="Original Transcription"
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy Original Text"
                          content={transcript.asrText ?? ""}
                        />
                        <Action.Paste
                          title="Paste Original Text"
                          content={transcript.asrText ?? ""}
                        />
                      </ActionPanel>
                    }
                  />
                }
              />
            ) : null}
            {appPath ? (
              <Action.Open
                title={`Open ${appName}`}
                icon={appIcon}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                target={appPath}
              />
            ) : null}
            {wisprFlowPath ? (
              <Action.Open
                title="Open Wispr Flow"
                icon={Icon.Microphone}
                shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                target={wisprFlowPath}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Transcript ID"
              content={transcript.transcriptEntityId}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Archive Transcript"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleArchive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
