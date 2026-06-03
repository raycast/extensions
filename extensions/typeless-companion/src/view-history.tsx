import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import {
  TypelessHistoryRow,
  copyLabel,
  databaseExists,
  formatDate,
  formatDuration,
  hasTranscript,
  listHistory,
  modeKind,
  modeLabel,
  needsRetry,
  openTypelessHistory,
  revealInFinder,
  statusLabel,
  titleForRow,
} from "./lib/typeless";

type Filter =
  | "all"
  | "dictation"
  | "ask-anything"
  | "translation"
  | "needs-retry"
  | "other";

export default function Command() {
  const [rows, setRows] = useState<TypelessHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function refresh() {
    setIsLoading(true);
    setError(null);

    try {
      if (!databaseExists()) {
        setRows([]);
        setError("Typeless history database was not found.");
        return;
      }
      setRows(await listHistory());
    } catch (error) {
      setRows([]);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visibleRows = useMemo(() => {
    if (filter === "dictation") {
      return rows.filter((row) => modeKind(row) === "dictation");
    }
    if (filter === "ask-anything") {
      return rows.filter((row) => modeKind(row) === "ask-anything");
    }
    if (filter === "translation") {
      return rows.filter((row) => modeKind(row) === "translation");
    }
    if (filter === "needs-retry") return rows.filter(needsRetry);
    if (filter === "other") {
      return rows.filter((row) => modeKind(row) === "other");
    }
    return rows;
  }, [filter, rows]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Typeless history..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Dictations" value="dictation" />
          <List.Dropdown.Item title="Ask Anything" value="ask-anything" />
          <List.Dropdown.Item title="Translations" value="translation" />
          <List.Dropdown.Item title="Needs Retry" value="needs-retry" />
          <List.Dropdown.Item title="Other" value="other" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Typeless History Unavailable"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : (
        visibleRows.map((row) => (
          <HistoryItem
            key={`${row.source}-${row.id}`}
            row={row}
            onRefresh={refresh}
          />
        ))
      )}
    </List>
  );
}

function HistoryItem({
  row,
  onRefresh,
}: {
  row: TypelessHistoryRow;
  onRefresh: () => Promise<void>;
}) {
  const title = titleForRow(row);
  const duration = formatDuration(row.duration);

  return (
    <List.Item
      icon={iconForRow(row)}
      title={title}
      subtitle={subtitleForRow(row)}
      accessories={duration ? [{ text: duration }] : undefined}
      detail={<HistoryDetail row={row} />}
      actions={<HistoryActions row={row} onRefresh={onRefresh} />}
    />
  );
}

function HistoryActions({
  row,
  onRefresh,
}: {
  row: TypelessHistoryRow;
  onRefresh: () => Promise<void>;
}) {
  const label = copyLabel(row);

  return (
    <ActionPanel>
      {hasTranscript(row) ? (
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title={`Copy ${label}`}
            content={row.transcript}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title={`Paste ${label}`}
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              await Clipboard.paste(row.transcript);
            }}
          />
        </ActionPanel.Section>
      ) : null}

      {needsRetry(row) ? (
        <ActionPanel.Section title="Retry">
          <Action
            title="Open Typeless History"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await openTypelessHistory();
              await showToast({
                style: Toast.Style.Success,
                title: "Opened Typeless",
                message: "Use the Retry button on the matching history row.",
              });
            }}
          />
          {row.audioPath ? (
            <Action
              title="Reveal Recording in Finder"
              icon={Icon.Finder}
              onAction={async () => {
                await revealInFinder(row.audioPath as string);
              }}
            />
          ) : null}
        </ActionPanel.Section>
      ) : null}

      <ActionPanel.Section>
        {row.audioPath ? (
          <Action.Open
            title="Open Recording"
            target={row.audioPath}
            icon={Icon.Play}
          />
        ) : null}
        {row.audioPath ? (
          <Action.CopyToClipboard
            title="Copy Recording Path"
            content={row.audioPath}
          />
        ) : null}
        <Action.CopyToClipboard title="Copy Row ID" content={row.id} />
        <Action
          title="Open Typeless"
          icon={Icon.Gear}
          onAction={async () => {
            await open("typeless://");
          }}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function HistoryDetail({ row }: { row: TypelessHistoryRow }) {
  const markdown = detailMarkdown(row);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Mode">
            <List.Item.Detail.Metadata.TagList.Item
              text={modeLabel(row)}
              color={colorForRow(row)}
            />
          </List.Item.Detail.Metadata.TagList>
          {row.duration !== null ? (
            <List.Item.Detail.Metadata.Label
              title="Duration"
              text={formatDuration(row.duration) ?? ""}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Text Length"
            text={`${row.textLength} chars`}
          />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={statusLabel(row)}
          />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={formatDate(row.createdAt)}
          />
          {row.delivery ? (
            <List.Item.Detail.Metadata.Label
              title="Delivery"
              text={row.delivery}
            />
          ) : null}
          {row.selectedText ? (
            <List.Item.Detail.Metadata.Label
              title="Selected Text"
              text={`${row.selectedText.length} chars`}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          {row.updatedAt ? (
            <List.Item.Detail.Metadata.Label
              title="Updated"
              text={formatDate(row.updatedAt)}
            />
          ) : null}
          {row.audioPath ? (
            <List.Item.Detail.Metadata.Label
              title="Recording"
              text={row.audioPath}
            />
          ) : null}
          {row.focusedAppName ? (
            <List.Item.Detail.Metadata.Label
              title="Focused App"
              text={row.focusedAppName}
            />
          ) : null}
          {row.focusedWindowTitle ? (
            <List.Item.Detail.Metadata.Label
              title="Window"
              text={row.focusedWindowTitle}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Source" text={row.source} />
          <List.Item.Detail.Metadata.Label title="Row ID" text={row.id} />
          {row.appVersion ? (
            <List.Item.Detail.Metadata.Label
              title="Typeless Version"
              text={row.appVersion}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function iconForRow(row: TypelessHistoryRow) {
  switch (modeKind(row)) {
    case "retry":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "ask-anything":
      return { source: Icon.QuestionMark, tintColor: Color.Purple };
    case "translation":
      return { source: Icon.Globe, tintColor: Color.Green };
    case "dictation":
      return { source: Icon.Microphone, tintColor: Color.Blue };
    case "other":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function colorForRow(row: TypelessHistoryRow) {
  switch (modeKind(row)) {
    case "retry":
      return Color.Orange;
    case "ask-anything":
      return Color.Purple;
    case "translation":
      return Color.Green;
    case "dictation":
      return Color.Blue;
    case "other":
      return Color.SecondaryText;
  }
}

function subtitleForRow(row: TypelessHistoryRow) {
  return row.focusedAppName ?? undefined;
}

function detailMarkdown(row: TypelessHistoryRow) {
  if (modeKind(row) === "ask-anything") {
    const prompt = row.askPrompt || titleForRow(row);
    const answer = row.askAnswer || row.transcript;
    const selectedText = row.selectedText
      ? `\n\n## Selected Text\n\n${row.selectedText}`
      : "";

    return `## Prompt\n\n${prompt}${selectedText}\n\n## Answer\n\n${answer || "No answer was saved."}`;
  }

  if (hasTranscript(row)) return row.transcript;

  return "No transcript was saved for this recording. Open Typeless History and use its Retry button for this row.";
}
