import { Action, ActionPanel, Clipboard, Icon, List, Toast, closeMainWindow, showToast } from "@raycast/api";
import { memo } from "react";
import { formatCost } from "../util/format-cost";
import { formatDuration } from "../util/format-duration";
import { preview } from "../util/preview";
import { formatRelativeDate } from "../util/relative-date";
import type { Entry } from "../util/types";
import { TranscriptDetail } from "./TranscriptDetail";

interface EntryItemProps {
  entry: Entry;
  onReload: () => void;
  onToggleDetail: () => void;
  showingDetail: boolean;
}

function EntryItemView({ entry, onReload, onToggleDetail, showingDetail }: EntryItemProps) {
  const title = preview(entry.transcript, 70);
  const dateLabel = formatRelativeDate(entry.startedAt);

  return (
    <List.Item
      title={title}
      icon={Icon.SpeechBubble}
      keywords={entry.keywords}
      accessories={showingDetail ? undefined : [{ text: dateLabel }]}
      detail={
        <List.Item.Detail
          markdown={entry.transcript}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Recorded" text={dateLabel} />
              <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(entry.duration)} />
              <List.Item.Detail.Metadata.Label title="Words" text={entry.wordCount.toLocaleString()} />
              <List.Item.Detail.Metadata.Label title="Cost" text={formatCost(entry.costUSD)} />
              {entry.source ? <List.Item.Detail.Metadata.Label title="Source" text={entry.source} /> : null}
              {entry.model ? <List.Item.Detail.Metadata.Label title="Model" text={entry.model} /> : null}
              {entry.status ? (
                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={entry.status}
                    color={entry.status === "succeeded" ? "#34c759" : "#ff9f0a"}
                  />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Transcript" content={entry.transcript} />
          <Action
            title="Paste to Active App"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              await Clipboard.paste(entry.transcript);
              await closeMainWindow();
            }}
          />
          <Action.Push
            title="View Full Transcript"
            icon={Icon.Document}
            target={<TranscriptDetail entry={entry} />}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title={showingDetail ? "Hide Detail Pane" : "Show Detail Pane"}
            icon={showingDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
          <ActionPanel.Section>
            {entry.filePath ? (
              <Action.ShowInFinder path={entry.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
            ) : null}
            {entry.filePath ? (
              <Action.Open
                title="Play Audio"
                target={entry.filePath}
                icon={Icon.Play}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            ) : null}
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy ID"
              content={entry.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reload History"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                onReload();
                await showToast({ style: Toast.Style.Success, title: "Reloaded" });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export const EntryItem = memo(EntryItemView);
