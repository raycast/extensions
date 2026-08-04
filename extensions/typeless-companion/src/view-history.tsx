import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  PopToRootType,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import {
  TypelessHistoryRow,
  copyLabel,
  databaseExists,
  formatCharacterCount,
  formatDate,
  formatDuration,
  hasNoTranscript,
  hasTranscript,
  listHistory,
  modeKind,
  modeLabel,
  originalModeLabel,
  statusLabel,
  titleForRow,
} from "./lib/typeless";

type Filter =
  | "all"
  | "dictation"
  | "ask-anything"
  | "translation"
  | "no-transcript"
  | "other";

type CopyWindowBehavior = "keep-open" | "close" | "close-and-exit-command";

const monochromeModeColor = {
  light: "#111111",
  dark: "#FFFFFF",
  adjustContrast: false,
};

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
    if (filter === "no-transcript") return rows.filter(hasNoTranscript);
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
          <List.Dropdown.Item title="No Transcript" value="no-transcript" />
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
          <HistoryItem key={`${row.source}-${row.id}`} row={row} />
        ))
      )}
    </List>
  );
}

function HistoryItem({ row }: { row: TypelessHistoryRow }) {
  const title = titleForRow(row);
  const duration = formatDuration(row.duration);

  return (
    <List.Item
      icon={iconForRow(row)}
      title={title}
      subtitle={subtitleForRow(row)}
      accessories={duration ? [{ text: duration }] : undefined}
      detail={<HistoryDetail row={row} />}
      actions={<HistoryActions row={row} />}
    />
  );
}

function HistoryActions({ row }: { row: TypelessHistoryRow }) {
  const label = copyLabel(row);
  const preferences = getPreferenceValues<Preferences.ViewHistory>();
  const copyWindowBehavior = preferences.copyWindowBehavior ?? "close";

  if (!hasTranscript(row) && !row.audioPath) return null;

  return (
    <ActionPanel>
      {hasTranscript(row) ? (
        <ActionPanel.Section>
          <Action
            title={`Copy ${label}`}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await copyHistoryText(row, copyWindowBehavior);
            }}
          />
          <Action.Paste
            title={`Paste ${label}`}
            content={row.transcript}
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel.Section>
      ) : null}

      {row.audioPath ? (
        <ActionPanel.Section title="Recording">
          <Action.CopyToClipboard
            title="Copy Recording Path"
            content={row.audioPath}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

async function copyHistoryText(
  row: TypelessHistoryRow,
  behavior: CopyWindowBehavior,
) {
  await Clipboard.copy(row.transcript);

  const title = `Copied ${modeLabel(row)}`;
  if (behavior === "keep-open") {
    await showToast({
      style: Toast.Style.Success,
      title,
    });
    return;
  }

  await showHUD(title, {
    clearRootSearch: behavior === "close-and-exit-command",
    popToRootType:
      behavior === "close-and-exit-command"
        ? PopToRootType.Immediate
        : PopToRootType.Suspended,
  });
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
          {hasNoTranscript(row) ? (
            <List.Item.Detail.Metadata.Label
              title="Attempt"
              text={originalModeLabel(row)}
            />
          ) : null}
          {row.duration !== null ? (
            <List.Item.Detail.Metadata.Label
              title="Duration"
              text={formatDuration(row.duration) ?? ""}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Text Length"
            text={formatCharacterCount(row.textLength)}
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
              text={formatCharacterCount(row.selectedText.length)}
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function iconForRow(row: TypelessHistoryRow) {
  switch (modeKind(row)) {
    case "no-transcript":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "ask-anything":
      return { source: Icon.QuestionMark, tintColor: Color.Green };
    case "translation":
      return { source: Icon.Globe, tintColor: Color.Blue };
    case "dictation":
      return { source: Icon.Microphone, tintColor: monochromeModeColor };
    case "other":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function colorForRow(row: TypelessHistoryRow) {
  switch (modeKind(row)) {
    case "no-transcript":
      return Color.Orange;
    case "ask-anything":
      return Color.Green;
    case "translation":
      return Color.Blue;
    case "dictation":
      return monochromeModeColor;
    case "other":
      return Color.SecondaryText;
  }
}

function subtitleForRow(row: TypelessHistoryRow) {
  if (hasNoTranscript(row)) return originalModeLabel(row);
  return row.focusedAppName ?? undefined;
}

function detailMarkdown(row: TypelessHistoryRow) {
  if (hasNoTranscript(row)) {
    const attempt = originalModeLabel(row).toLowerCase();
    return `## No Transcript\n\nTypeless did not save a usable transcript for this ${attempt} attempt. Open Typeless directly if you want to retry or inspect it there.`;
  }

  if (modeKind(row) === "ask-anything") {
    const prompt = row.askPrompt || titleForRow(row);
    const answer = row.askAnswer || row.transcript;
    const selectedText = row.selectedText
      ? `\n\n## Selected Text\n\n${row.selectedText}`
      : "";

    return `## Prompt\n\n${prompt}${selectedText}\n\n## Answer\n\n${answer}`;
  }

  return row.transcript;
}
