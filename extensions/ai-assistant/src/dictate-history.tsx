import { ActionPanel, Action, List, Icon, Clipboard, closeMainWindow } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  TranscriptionRecord,
  getTranscriptionHistory,
  formatTranscriptionDetails,
} from "./utils/transcription-history";
import { formatDistanceToNow } from "date-fns";

export default function Command() {
  const [history, setHistory] = useState<TranscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<TranscriptionRecord | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const records = await getTranscriptionHistory();
      setHistory(records);
      if (records.length > 0) {
        setSelectedRecord(records[0]);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPasteAndClose(text: string) {
    await Clipboard.paste(text);
    await closeMainWindow();
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Dictation History"
      searchBarPlaceholder="Search transcriptions..."
      onSelectionChange={(id) => {
        const record = history.find((r) => r.id === id);
        if (record) {
          setSelectedRecord(record);
        }
      }}
      selectedItemId={selectedRecord?.id}
    >
      <List.Section title="Transcription History" subtitle={`${history.length} items`}>
        {history.map((record) => (
          <List.Item
            key={record.id}
            id={record.id}
            title={record.text}
            subtitle={`Language: ${record.language}`}
            accessories={[
              {
                text: formatDistanceToNow(record.timestamp, { addSuffix: true }),
                tooltip: new Date(record.timestamp).toLocaleString(),
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={formatTranscriptionDetails(record)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={record.transcribed ? "Transcribed" : "Failed"}
                        color={record.transcribed ? "#2BBA52" : "#FF6363"}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Date"
                      text={new Date(record.timestamp).toLocaleString()}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Label title="Language" text={record.language} icon={Icon.Globe} />
                    {record.transcriptionDetails?.targetLanguage !== "auto" && (
                      <List.Item.Detail.Metadata.Label
                        title="Target Language"
                        text={record.transcriptionDetails?.targetLanguage}
                        icon={Icon.Switch}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Transcription Mode"
                      text={
                        record.transcriptionDetails?.mode === "local"
                          ? `Local Whisper (${record.transcriptionDetails.model})`
                          : record.transcriptionDetails?.mode === "gpt4"
                            ? "GPT-4 Audio"
                            : "OpenAI Whisper"
                      }
                      icon={Icon.Microphone}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Text Correction"
                      text={record.transcriptionDetails?.textCorrectionEnabled ? "Enabled" : "Disabled"}
                      icon={record.transcriptionDetails?.textCorrectionEnabled ? Icon.CheckCircle : Icon.Circle}
                    />
                    {record.transcriptionDetails?.activeApp && (
                      <List.Item.Detail.Metadata.Label
                        title="Active Application"
                        text={record.transcriptionDetails.activeApp}
                        icon={Icon.Window}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy, Paste and Close"
                    icon={Icon.TextCursor}
                    onAction={() => copyPasteAndClose(record.text)}
                  />
                  <Action
                    title="Copy and Close"
                    icon={Icon.Clipboard}
                    onAction={() => {
                      Clipboard.copy(record.text);
                      closeMainWindow();
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action title="Copy" icon={Icon.Clipboard} onAction={() => Clipboard.copy(record.text)} />
                </ActionPanel.Section>
                {!record.transcribed && (
                  <ActionPanel.Section>
                    <Action
                      title="Retry Transcription"
                      icon={Icon.ArrowClockwise}
                      onAction={() => {
                        // TODO: Implement retry transcription
                      }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
