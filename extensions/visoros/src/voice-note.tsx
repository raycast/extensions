// src/voice-note.tsx
import { Detail, ActionPanel, Action, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import { useTranscribe } from "./hooks/useTranscribe";

export default function Command() {
  const [transcription, setTranscription] = useState("");
  const { isRecording, isTranscribing, startRecording, stopRecording } = useTranscribe();

  const handleRecording = useCallback(async () => {
    try {
      if (isRecording) {
        const text = await stopRecording();
        if (text) {
          setTranscription(text);
        }
      } else {
        await startRecording();
      }
    } catch (error) {
      console.error("Recording handler error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Recording Error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleCopy = useCallback(async () => {
    if (!transcription) return;

    await Clipboard.copy(transcription);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: "Voice note transcription has been copied",
    });
  }, [transcription]);

  // Create markdown content
  const markdown = transcription
    ? `# Voice Note Transcription\n\n${transcription}`
    : "# Voice Note\n\nClick the microphone button or press ⌘ + R to start recording.";

  return (
    <Detail
      isLoading={isTranscribing}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={isRecording ? "Stop Recording" : "Start Recording"}
              icon={isRecording ? Icon.Stop : Icon.Microphone}
              onAction={handleRecording}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>

          {transcription && (
            <ActionPanel.Section>
              <Action
                title="Copy to Clipboard"
                icon={Icon.Clipboard}
                onAction={handleCopy}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
