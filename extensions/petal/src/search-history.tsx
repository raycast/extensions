import { Action, ActionPanel, Color, Icon, List, Toast, openCommandPreferences, showToast } from "@raycast/api";
import { useHistoryRecords } from "./hooks";
import { getHistoryDirectoryPath, modelIconForModelID } from "./utils";

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
  const historyDirectory = getHistoryDirectoryPath();
  const { records, isLoading, error, revalidate } = useHistoryRecords();

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Unable to read history"
          description={error.message}
          actions={
            <ActionPanel>
              <Action.Open title="Open History Folder" target={historyDirectory} />
              <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search transcriptions">
      {!isLoading && records.length === 0 && (
        <List.EmptyView
          title="No history entries"
          description="Run at least one Petal transcription, then refresh."
          actions={
            <ActionPanel>
              <Action.Open title="Open History Folder" target={historyDirectory} />
              <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
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
        const chars = record.preferredVariant?.characterCount ?? record.entry.characterCount ?? transcript.length;
        const title = transcript.length > 0 ? truncate(transcript, 90) : "(Transcript file missing)";

        return (
          <List.Item
            key={record.entry.id}
            icon={modelIconForModelID(record.entry.modelID)}
            title={title}
            accessories={[{ text: `${chars} chars` }, { date: record.date }]}
            detail={
              <List.Item.Detail
                markdown={
                  transcript.length > 0 ? transcript : "_Transcript file is unavailable for this history entry._"
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Timestamp" text={formatDate(record.date)} />
                    <List.Item.Detail.Metadata.Label title="Characters" text={String(chars)} />
                    {record.transcriptPath && (
                      <List.Item.Detail.Metadata.Label title="Transcript File" text={record.transcriptPath} />
                    )}
                    {record.audioPath && <List.Item.Detail.Metadata.Label title="Audio File" text={record.audioPath} />}
                    <List.Item.Detail.Metadata.Label title="History Folder" text={historyDirectory} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Transcript" content={transcript} />
                  <Action.Paste
                    title="Paste Transcript"
                    content={transcript}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {record.transcriptPath && <Action.Open title="Open Transcript File" target={record.transcriptPath} />}
                  {record.audioPath && <Action.Open title="Open Audio File" target={record.audioPath} />}
                  <Action.ShowInFinder
                    title="Show History Folder"
                    path={historyDirectory}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
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
