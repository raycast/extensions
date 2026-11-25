import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ListErrorView } from "./components/error-view";
import { showHexFailure } from "./lib/feedback";
import { formatTime, groupByDay, wordCount } from "./lib/format";
import { hex } from "./lib/hex";
import { HistoryEntry, HistoryKind, HistoryReply } from "./lib/types";

const ALL_APPS = "";
const BROWSE_LIMIT = "1000";
const SEARCH_LIMIT = "100";

const KIND_LABELS: Record<HistoryKind, string> = {
  dictation: "Dictation",
  send: "Send",
  voice_action: "Voice Action",
  printed: "Printed",
  raw: "Raw",
};

const RETENTION_LABELS: Record<HistoryReply["retention"], string> = {
  off: "off",
  day: "for a day",
  week: "for a week",
  month: "for a month",
  forever: "forever",
};

function historyArgs(search: string, app: string): string[] {
  const query = search.trim();
  const args = ["history", "--raw", "--limit", query ? SEARCH_LIMIT : BROWSE_LIMIT];
  if (query) args.push("--search", query);
  if (app !== ALL_APPS) args.push("--app", app);
  return args;
}

function changedRaw(entry: HistoryEntry): string | undefined {
  return entry.raw_text?.trim() !== entry.final_text.trim() ? entry.raw_text : undefined;
}

export default function Command() {
  const { primaryAction } = getPreferenceValues<Preferences.SearchHistory>();
  const [searchText, setSearchText] = useState("");
  const [app, setApp] = useState(ALL_APPS);
  const [showingDetail, setShowingDetail] = useState(true);

  const { data, isLoading, error, revalidate } = usePromise(
    (search: string, app: string) => hex<HistoryReply>(historyArgs(search, app)),
    [searchText, app],
    { onError: () => undefined },
  );

  const { data: apps, revalidate: revalidateApps } = usePromise(
    async () => {
      const reply = await hex<HistoryReply>(["history", "--limit", BROWSE_LIMIT]);
      const names = new Set<string>();
      for (const entry of reply.entries) {
        if (entry.application) names.add(entry.application);
      }
      return [...names].sort((a, b) => a.localeCompare(b));
    },
    [],
    { onError: () => undefined },
  );

  const refresh = () => {
    revalidate();
    revalidateApps();
  };

  const searching = searchText.trim().length > 0;
  const filtered = searching || app !== ALL_APPS;
  const entries = data?.entries ?? [];
  const sections = useMemo(
    () =>
      searching
        ? [{ title: "Best Matches", items: entries }]
        : groupByDay(entries, (entry) => new Date(entry.timestamp_ms)),
    [entries, searching],
  );
  const retention = data && RETENTION_LABELS[data.retention];
  const limitNote = data?.truncated
    ? searching
      ? `Top ${SEARCH_LIMIT} matches`
      : `Latest ${BROWSE_LIMIT} dictations`
    : undefined;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search dictations"
      isShowingDetail={showingDetail && entries.length > 0}
      searchBarAccessory={
        // Raycast drops a stored value that isn't among the items when the dropdown first renders.
        apps && (
          <List.Dropdown tooltip="Filter by App" onChange={setApp} storeValue>
            <List.Dropdown.Item title="All Apps" value={ALL_APPS} />
            {apps.map((name) => (
              <List.Dropdown.Item key={name} title={name} value={name} />
            ))}
          </List.Dropdown>
        )
      }
    >
      {error ? (
        <ListErrorView error={error} onRetry={refresh} />
      ) : isLoading ? null : data?.retention === "off" && entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="History is off in Hex"
          description="Turn on History in Hex's settings to keep dictations."
          actions={
            <ActionPanel>
              <Action title="Open Hex History" icon={Icon.AppWindow} onAction={() => openHistoryPane()} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Microphone}
          title={filtered ? "No matching dictations" : "No dictations yet"}
          description={data && !filtered && retention ? `Hex keeps dictations ${retention}.` : undefined}
        />
      )}
      {sections.map((section, index) => (
        <List.Section key={section.title} title={section.title} subtitle={index === 0 ? limitNote : undefined}>
          {section.items.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              primaryAction={primaryAction}
              showingDetail={showingDetail}
              onToggleDetail={() => setShowingDetail((value) => !value)}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function HistoryItem({
  entry,
  primaryAction,
  showingDetail,
  onToggleDetail,
  onRefresh,
}: {
  entry: HistoryEntry;
  primaryAction: "paste" | "copy";
  showingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const date = new Date(entry.timestamp_ms);
  const raw = changedRaw(entry);
  const text = entry.final_text;

  const paste = <Action.Paste key="paste" content={text} />;
  const copy = <Action.CopyToClipboard key="copy" content={text} />;

  return (
    <List.Item
      title={text.replace(/\s+/g, " ").trim() || "Empty transcript"}
      accessories={
        showingDetail
          ? undefined
          : [
              ...(entry.application ? [{ tag: entry.application }] : []),
              { text: formatTime(date), tooltip: date.toLocaleString() },
            ]
      }
      detail={
        <List.Item.Detail
          markdown={raw !== undefined ? `${text}\n\n---\n\n**Before Output steps**\n\n${raw}` : text}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="When" text={date.toLocaleString()} />
              {entry.application && <List.Item.Detail.Metadata.Label title="App" text={entry.application} />}
              {entry.mode && <List.Item.Detail.Metadata.Label title="Mode" text={entry.mode} />}
              <List.Item.Detail.Metadata.TagList title="Kind">
                <List.Item.Detail.Metadata.TagList.Item
                  text={KIND_LABELS[entry.kind] ?? entry.kind}
                  color={entry.kind === "dictation" ? Color.SecondaryText : Color.Blue}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Words" text={String(wordCount(text))} />
              {entry.recording && (
                <List.Item.Detail.Metadata.Label title="Recording" text="Kept" icon={Icon.Waveform} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {primaryAction === "paste" ? [paste, copy] : [copy, paste]}
            {raw !== undefined && (
              <>
                <Action.Paste
                  title="Paste Original"
                  content={raw}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action.CopyToClipboard title="Copy Original" content={raw} />
              </>
            )}
          </ActionPanel.Section>
          {entry.recording && (
            <ActionPanel.Section title="Recording">
              <Action.Open
                title="Play Recording"
                icon={Icon.Play}
                target={entry.recording}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              <Action.ShowInFinder path={entry.recording} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action
              title="Open Hex History"
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => openHistoryPane()}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function openHistoryPane() {
  try {
    await hex(["window", "show", "history"]);
  } catch (error) {
    await showHexFailure(error, "Couldn't open Hex");
  }
}
