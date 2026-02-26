import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useMemo } from "react";
import { useHistoryRecords } from "./hooks";
import { PETAL_HISTORY_DIR } from "./utils";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function truncate(value: string, max = 120) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export default function Command() {
  const { records, isLoading, error, revalidate } = useHistoryRecords();
  const latestTranscript = useMemo(
    () => records.find((record) => record.transcript.trim().length > 0)?.transcript,
    [records],
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Unable to read Petal history"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.Open title="Open History Folder" target={PETAL_HISTORY_DIR} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search Petal transcription history">
      {!isLoading && records.length === 0 && (
        <List.EmptyView
          title="No history entries"
          description="Run at least one Petal transcription, then refresh."
          actions={
            <ActionPanel>
              <Action.Open title="Open History Folder" target={PETAL_HISTORY_DIR} />
              <Action
                title="Refresh History"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await revalidate();
                  await showToast({ style: Toast.Style.Success, title: "History refreshed" });
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {records.map((record) => {
        const transcript = record.transcript.trim();
        const mode = record.preferredVariant?.mode ?? record.entry.transcriptionMode ?? "unknown";
        const chars = record.preferredVariant?.characterCount ?? record.entry.characterCount ?? transcript.length;
        const title = transcript.length > 0 ? truncate(transcript, 90) : "(Transcript file missing)";

        return (
          <List.Item
            key={record.entry.id}
            icon={Icon.TextDocument}
            title={title}
            subtitle={record.entry.modelID}
            accessories={[{ text: mode }, { text: `${chars} chars` }, { date: record.date }]}
            detail={
              <List.Item.Detail
                markdown={
                  transcript.length > 0 ? transcript : "_Transcript file is unavailable for this history entry._"
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Timestamp" text={formatDate(record.date)} />
                    <List.Item.Detail.Metadata.Label title="Model" text={record.entry.modelID} />
                    <List.Item.Detail.Metadata.Label title="Mode" text={mode} />
                    <List.Item.Detail.Metadata.Label title="Characters" text={String(chars)} />
                    {record.transcriptPath && (
                      <List.Item.Detail.Metadata.Label title="Transcript File" text={record.transcriptPath} />
                    )}
                    {record.audioPath && <List.Item.Detail.Metadata.Label title="Audio File" text={record.audioPath} />}
                    <List.Item.Detail.Metadata.Label title="History Folder" text={PETAL_HISTORY_DIR} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Transcript"
                    content={transcript}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action.Paste
                    title="Paste Transcript"
                    content={transcript}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                  {latestTranscript && (
                    <Action.CopyToClipboard
                      title="Copy Latest Transcript"
                      content={latestTranscript}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {record.transcriptPath && <Action.Open title="Open Transcript File" target={record.transcriptPath} />}
                  {record.audioPath && <Action.Open title="Open Audio File" target={record.audioPath} />}
                  <Action.ShowInFinder
                    title="Show History Folder"
                    path={PETAL_HISTORY_DIR}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action
                    title="Refresh History"
                    icon={Icon.ArrowClockwise}
                    onAction={async () => {
                      await revalidate();
                      await showToast({ style: Toast.Style.Success, title: "History refreshed" });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
