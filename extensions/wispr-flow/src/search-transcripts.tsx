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
  getPreferenceValues,
  openExtensionPreferences,
  Cache,
} from "@raycast/api";
import { useCachedPromise, usePromise, executeSQL } from "@raycast/utils";
import { useState, useMemo, useCallback } from "react";
import { Transcript } from "./types";
import {
  getAppName,
  getDisplayText,
  parseTimestamp,
  formatDuration,
  groupTranscriptsByDate,
} from "./utils";
import { getDbPath, dbExists, writeSQL } from "./db";

const COLUMNS = `transcriptEntityId, asrText, formattedText, editedText,
  timestamp, app, url, duration, numWords, status, language, conversationId, isArchived`;

const PAGE_SIZE = 50;

const cache = new Cache();

const SORT_OPTIONS: Record<string, string> = {
  "sort:newest": "timestamp DESC",
  "sort:oldest": "timestamp ASC",
  "sort:longest": "duration DESC",
  "sort:most-words": "numWords DESC",
};

function buildPaginatedQuery(
  search: string,
  appFilter: string,
  showArchived: boolean,
  minDuration: number,
  sort: string,
  limit: number,
  offset: number,
) {
  const conditions: string[] = [];
  if (!showArchived) {
    conditions.push("(isArchived = 0 OR isArchived IS NULL)");
  }

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

  if (minDuration > 0) {
    conditions.push(`duration >= ${minDuration}`);
  }

  const orderBy = SORT_OPTIONS[sort] ?? "timestamp DESC";
  return `SELECT ${COLUMNS} FROM History WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
}

export default function Command() {
  const { primaryAction, showArchived, minimumDuration, confirmBeforeArchive } =
    getPreferenceValues<Preferences>();
  const dbPath = getDbPath();

  if (!dbExists()) {
    return (
      <Detail
        markdown={`## Wispr Flow Database Not Found\n\nCould not find the Wispr Flow database at:\n\n\`${dbPath}\`\n\nMake sure [Wispr Flow](https://wisprflow.ai) is installed and has at least one transcription recorded, or update the database path in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const [searchText, setSearchText] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState(
    cache.get("sortOrder") ?? "sort:newest",
  );
  const minDuration = Number(minimumDuration) || 0;

  const handleDropdownChange = useCallback((value: string) => {
    if (value.startsWith("sort:")) {
      setSortOrder(value);
      cache.set("sortOrder", value);
    } else {
      setAppFilter(value);
    }
  }, []);

  const { isLoading, data, pagination, revalidate } = useCachedPromise(
    (
      search: string,
      app: string,
      archived: boolean,
      minDur: number,
      sort: string,
    ) =>
      async (options: { page: number }) => {
        const offset = options.page * PAGE_SIZE;
        const query = buildPaginatedQuery(
          search,
          app,
          archived,
          minDur,
          sort,
          PAGE_SIZE,
          offset,
        );
        const results = await executeSQL<Transcript>(dbPath, query);
        return { data: results, hasMore: results.length === PAGE_SIZE };
      },
    [searchText, appFilter, showArchived, minDuration, sortOrder],
  );

  const { data: uniqueAppsData } = useCachedPromise(
    (archived: boolean) => {
      const archiveCondition = archived
        ? ""
        : "AND (isArchived = 0 OR isArchived IS NULL)";
      return executeSQL<{ app: string }>(
        dbPath,
        `SELECT DISTINCT app FROM History WHERE app IS NOT NULL AND app != '' ${archiveCondition} ORDER BY app`,
      );
    },
    [showArchived],
  );

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
        <List.Dropdown
          tooltip="Filter & Sort"
          value={appFilter}
          onChange={handleDropdownChange}
        >
          <List.Dropdown.Section title="Filter by App">
            <List.Dropdown.Item title="All Apps" value="all" />
            {uniqueApps.map((app) => (
              <List.Dropdown.Item
                key={app.bundleId}
                title={app.name}
                value={app.bundleId}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="Newest First" value="sort:newest" />
            <List.Dropdown.Item title="Oldest First" value="sort:oldest" />
            <List.Dropdown.Item title="Longest Duration" value="sort:longest" />
            <List.Dropdown.Item title="Most Words" value="sort:most-words" />
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
              primaryAction={primaryAction}
              confirmBeforeArchive={confirmBeforeArchive}
              dbPath={dbPath}
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
  primaryAction,
  confirmBeforeArchive,
  dbPath,
  onArchive,
}: {
  transcript: Transcript;
  appPathMap: Map<string, string>;
  primaryAction: string;
  confirmBeforeArchive: boolean;
  dbPath: string;
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
    if (confirmBeforeArchive) {
      const confirmed = await confirmAlert({
        title: "Archive Transcript",
        message: "Are you sure you want to archive this transcript?",
        primaryAction: {
          title: "Archive",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }
    const escaped = transcript.transcriptEntityId.replace(/'/g, "''");
    writeSQL(
      `UPDATE History SET isArchived = 1 WHERE transcriptEntityId = '${escaped}'`,
    );
    onArchive();
    await showToast({
      style: Toast.Style.Success,
      title: "Transcript archived",
      primaryAction: {
        title: "Undo",
        onAction: async (toast) => {
          writeSQL(
            `UPDATE History SET isArchived = 0 WHERE transcriptEntityId = '${escaped}'`,
          );
          onArchive();
          await toast.hide();
        },
      },
    });
  }, [transcript.transcriptEntityId, confirmBeforeArchive, dbPath, onArchive]);

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
                title="Dictated"
                text={date.toLocaleString()}
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
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {primaryAction === "paste" ? (
              <>
                <Action.Paste
                  title="Paste to Active App"
                  content={displayText}
                />
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={displayText}
                />
              </>
            ) : (
              <>
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={displayText}
                />
                <Action.Paste
                  title="Paste to Active App"
                  content={displayText}
                />
              </>
            )}
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
          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
