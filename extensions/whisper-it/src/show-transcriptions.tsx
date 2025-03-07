import {
  ActionPanel,
  Detail,
  List,
  Action,
  Icon,
  LocalStorage,
  confirmAlert,
  showToast,
  Toast,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TranscriptionEntry } from "./types";
import fs from "fs";

export default function Command() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  async function loadTranscriptions() {
    try {
      const stored = await LocalStorage.getItem<string>("transcriptions");
      if (stored) {
        setTranscriptions(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading transcriptions:", error);
    }
    setIsLoading(false);
  }

  async function handleDelete(transcription: TranscriptionEntry) {
    const options: Alert.Options = {
      title: "Delete Transcription",
      message: "Are you sure you want to delete this transcription?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        // Delete audio file if it exists
        if (transcription.audioFilePath && fs.existsSync(transcription.audioFilePath)) {
          fs.unlinkSync(transcription.audioFilePath);
        }

        // Remove from storage
        const updatedTranscriptions = transcriptions.filter((t) => t.id !== transcription.id);
        await LocalStorage.setItem("transcriptions", JSON.stringify(updatedTranscriptions));
        setTranscriptions(updatedTranscriptions);

        await showToast({
          style: Toast.Style.Success,
          title: "Transcription deleted",
        });
      } catch (error) {
        console.error("Error deleting transcription:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete transcription",
        });
      }
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  return (
    <List isLoading={isLoading}>
      {transcriptions.map((transcription) => (
        <List.Item
          key={transcription.id}
          icon={Icon.Document}
          title={transcription.text.substring(0, 50) + (transcription.text.length > 50 ? "..." : "")}
          subtitle={formatDate(transcription.timestamp)}
          accessories={transcription.audioFilePath ? [{ icon: Icon.SpeakerHigh }] : undefined}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={
                  <Detail
                    markdown={`# Transcription\n\n${transcription.text}\n\n*Recorded on: ${formatDate(
                      transcription.timestamp,
                    )}*${
                      transcription.audioFilePath
                        ? "\n\n*Audio file saved at: " + transcription.audioFilePath + "*"
                        : ""
                    }`}
                    actions={
                      <ActionPanel>
                        {transcription.audioFilePath && (
                          <Action.Open
                            title="Open Audio File"
                            icon={Icon.SpeakerHigh}
                            target={transcription.audioFilePath}
                          />
                        )}
                        <Action.CopyToClipboard title="Copy Text" content={transcription.text} />

                        <Action
                          title="Delete"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleDelete(transcription)}
                        />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action.CopyToClipboard title="Copy Text" content={transcription.text} />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(transcription)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
