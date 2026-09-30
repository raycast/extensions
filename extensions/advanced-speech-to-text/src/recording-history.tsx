import { useState, useEffect } from "react";
import {
  List,
  Action,
  ActionPanel,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
} from "@raycast/api";
import { listAudioFiles, cleanupTempFiles } from "./utils/audio";
import { transcribeAudio } from "./utils/openai";
import { TranscriptionFile } from "./types";
import { TEMP_DIRECTORY } from "./constants";
import { formatDuration, formatFileSize } from "./utils/time";

export default function RecordingHistory() {
  const [audioFiles, setAudioFiles] = useState<TranscriptionFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transcribingFiles, setTranscribingFiles] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    loadAudioFiles();
    // Clean up old files when component mounts
    cleanupTempFiles().catch(console.error);
  }, []);

  const loadAudioFiles = async () => {
    try {
      const files = await listAudioFiles(TEMP_DIRECTORY);
      setAudioFiles(files);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load audio files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribe = async (file: TranscriptionFile) => {
    if (transcribingFiles.has(file.id)) {
      return;
    }

    setTranscribingFiles((prev) => new Set(prev).add(file.id));

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Transcribing audio",
        message: file.fileName,
      });

      const transcription = await transcribeAudio(file.filePath);

      // Update the file with transcription
      setAudioFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                transcription,
                wordCount: transcription.split(/\s+/).length,
              }
            : f,
        ),
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Transcription complete",
        message: "Text copied to clipboard",
      });

      await Clipboard.copy(transcription);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Transcription failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTranscribingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const getFileIcon = (file: TranscriptionFile) => {
    if (transcribingFiles.has(file.id)) {
      return { source: Icon.Clock, tintColor: Color.Blue };
    }
    if (file.transcription) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Microphone, tintColor: Color.SecondaryText };
  };

  const getSubtitle = (file: TranscriptionFile): string => {
    const parts = [
      formatDuration(file.duration),
      formatFileSize(file.sizeInBytes),
      file.recordedAt.toLocaleDateString(),
    ];

    if (file.wordCount > 0) {
      parts.push(`${file.wordCount} words`);
    }

    return parts.join(" • ");
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recordings..."
      isShowingDetail
    >
      {audioFiles.length === 0 ? (
        <List.EmptyView
          icon={Icon.Microphone}
          title="No recordings found"
          description="Start recording to see your recording history"
        />
      ) : (
        audioFiles.map((file) => (
          <List.Item
            key={file.id}
            icon={getFileIcon(file)}
            title={file.fileName}
            subtitle={getSubtitle(file)}
            accessories={[
              transcribingFiles.has(file.id)
                ? { text: "Transcribing..." }
                : file.transcription
                  ? { text: "Transcribed" }
                  : { text: "Not transcribed" },
            ]}
            actions={
              <ActionPanel>
                {!file.transcription && !transcribingFiles.has(file.id) && (
                  <Action
                    title="Transcribe Audio"
                    onAction={() => handleTranscribe(file)}
                    icon={Icon.SpeechBubble}
                  />
                )}

                {file.transcription && (
                  <Action
                    title="Copy Transcription"
                    onAction={() => Clipboard.copy(file.transcription!)}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}

                {file.transcription && (
                  <Action
                    title="Re-transcribe"
                    onAction={() => handleTranscribe(file)}
                    icon={Icon.Repeat}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}

                <Action
                  title="Refresh List"
                  onAction={loadAudioFiles}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              </ActionPanel>
            }
            detail={
              file.transcription ? (
                <List.Item.Detail
                  markdown={`## Recording Transcription\n\n${file.transcription}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="File"
                        text={file.fileName}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Duration"
                        text={formatDuration(file.duration)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Size"
                        text={formatFileSize(file.sizeInBytes)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Recorded"
                        text={file.recordedAt.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Word Count"
                        text={file.wordCount.toString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : undefined
            }
          />
        ))
      )}
    </List>
  );
}
