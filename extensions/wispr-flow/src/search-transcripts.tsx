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
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Transcript } from "./types";
import {
  getAppName,
  getDisplayText,
  parseTimestamp,
  formatDuration,
  groupTranscriptsByDate,
} from "./utils";
import { getDbPath, dbExists, openWisprFlow, writeSQL } from "./db";
import { getWindowsAppPathMap } from "./platform";

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

  const allTranscripts = useMemo(() => data ?? [], [data]);
  // Memoized because the list re-renders on every page load; regrouping a few
  // hundred rows and rebuilding their detail panes is not free.
  const groups = useMemo(
    () => groupTranscriptsByDate(allTranscripts),
    [allTranscripts],
  );
  // Sections always render Today -> Yesterday -> ... -> Older whatever the SQL
  // ORDER BY is, so data[0] is only the top row under "Newest First". Under
  // "Oldest First" it lands in Older, the last section.
  const firstRenderedId = groups[0]?.transcripts[0]?.transcriptEntityId;

  // `useCachedPromise` paints last run's results before the fresh query lands, so
  // Raycast anchors the selection to whatever was on top back then. Anything
  // dictated since is prepended above it and the highlight ends up buried. Pin the
  // selection to the first rendered row once this query's own results arrive.
  //
  // The pin has to follow a full loading cycle rather than just `!isLoading`:
  // when the query changes there is one render where queryKey is already new but
  // isLoading and data still belong to the previous query, and pinning there
  // anchors to a row that may not even be in the new results.
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const queryKey = [
    searchText,
    appFilter,
    sortOrder,
    showArchived,
    minDuration,
  ].join("\u0000");
  const pinRef = useRef<{ key: string; phase: "armed" | "loading" | "pinned" }>(
    {
      key: queryKey,
      phase: "armed",
    },
  );
  const selectionRef = useRef<string | null>(null);
  const userMovedRef = useRef(false);
  if (pinRef.current.key !== queryKey) {
    pinRef.current = { key: queryKey, phase: "armed" };
    userMovedRef.current = false;
  }

  // Refs only, never state. This fires on every arrow-key press, and setting
  // state here would re-render the whole list -- regrouping every loaded row and
  // rebuilding each one's detail pane -- on each keystroke. While the fresh query
  // is in flight the rendered rows are frozen, so any change during that window
  // is the user navigating rather than Raycast reconciling.
  const handleSelectionChange = useCallback((id: string | null) => {
    if (
      pinRef.current.phase === "loading" &&
      selectionRef.current !== null &&
      id !== selectionRef.current
    ) {
      userMovedRef.current = true;
    }
    selectionRef.current = id;
  }, []);

  useEffect(() => {
    const pin = pinRef.current;
    if (isLoading) {
      if (pin.phase === "armed") pin.phase = "loading";
      return;
    }
    if (pin.phase !== "loading" || !firstRenderedId) return;
    pin.phase = "pinned";
    // The user already picked a row while the query was running; leave it be.
    if (userMovedRef.current) return;
    setPinnedId(firstRenderedId);
  }, [isLoading, queryKey, firstRenderedId]);

  // Hand selection back to Raycast once the pin has been applied. Staying
  // controlled would re-assert the pinned row on later re-renders (paging in
  // another 50 transcripts would bounce the highlight back to the top).
  useEffect(() => {
    if (pinnedId === null) return;
    const timer = setTimeout(() => setPinnedId(null), 150);
    return () => clearTimeout(timer);
  }, [pinnedId]);

  // Only re-arm when the archived row actually leaves the list and it was the
  // one selected -- otherwise its id dangles. With Show Archived on the row
  // stays put, and archiving a row you were not sitting on leaves the selection
  // valid either way; re-arming in those cases would jump you to the top for no
  // reason.
  const handleArchived = useCallback(
    (archivedId: string) => {
      if (!showArchived && archivedId === selectionRef.current) {
        pinRef.current = { key: pinRef.current.key, phase: "armed" };
        userMovedRef.current = false;
        setPinnedId(null);
      }
      revalidate();
    },
    [revalidate, showArchived],
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
  const { data: winRegistryMap } = usePromise(() =>
    process.platform === "win32"
      ? getWindowsAppPathMap()
      : Promise.resolve(new Map<string, string>()),
  );
  const appPathMap = useMemo(() => {
    const map = new Map<string, string>();
    const isWindows = process.platform === "win32";
    for (const app of installedApps ?? []) {
      if (isWindows) {
        const exeName = app.path
          .split(/[\\/]/)
          .pop()
          ?.replace(/\.exe$/i, "")
          .toLowerCase();
        if (exeName) map.set(exeName, app.path);
      } else if (app.bundleId) {
        map.set(app.bundleId, app.path);
      }
    }
    for (const [name, path] of winRegistryMap ?? []) {
      if (!map.has(name)) map.set(name, path);
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
  }, [installedApps, winRegistryMap]);

  return (
    <List
      isLoading={isLoading}
      selectedItemId={pinnedId ?? undefined}
      onSelectionChange={handleSelectionChange}
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
              onArchive={handleArchived}
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
  onArchive,
}: {
  transcript: Transcript;
  appPathMap: Map<string, string>;
  primaryAction: string;
  confirmBeforeArchive: boolean;
  onArchive: (archivedId: string) => void;
}) {
  const displayText = getDisplayText(transcript);
  const appName = getAppName(transcript.app);
  const date = parseTimestamp(transcript.timestamp);
  const duration = formatDuration(transcript.duration);

  const truncatedTitle =
    displayText.length > 80
      ? displayText.substring(0, 80) + "..."
      : displayText;
  const appKey =
    process.platform === "win32"
      ? transcript.app?.toLowerCase()
      : transcript.app;
  const appPath = appKey ? appPathMap.get(appKey) : undefined;
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
    await writeSQL(
      `UPDATE History SET isArchived = 1 WHERE transcriptEntityId = '${escaped}'`,
    );
    onArchive(transcript.transcriptEntityId);
    await showToast({
      style: Toast.Style.Success,
      title: "Transcript archived",
      primaryAction: {
        title: "Undo",
        onAction: async (toast) => {
          await writeSQL(
            `UPDATE History SET isArchived = 0 WHERE transcriptEntityId = '${escaped}'`,
          );
          onArchive(transcript.transcriptEntityId);
          await toast.hide();
        },
      },
    });
  }, [transcript.transcriptEntityId, confirmBeforeArchive, onArchive]);

  const hasOriginalText =
    transcript.asrText && transcript.asrText !== displayText;

  return (
    <List.Item
      id={transcript.transcriptEntityId}
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
            <Action
              title="Open Wispr Flow"
              icon={Icon.Microphone}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={() => openWisprFlow("wispr-flow://open")}
            />
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
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
