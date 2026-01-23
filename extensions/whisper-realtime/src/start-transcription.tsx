import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  showHUD,
  environment,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  getWhisperProcess,
  TranscriptionEntry,
  WhisperPreferences,
  generateRecordingFilename,
  StartOptions,
} from "./utils/whisper";

interface TranscriptionState {
  entries: TranscriptionEntry[];
  isRecording: boolean;
  status: string;
  error: string | null;
  recordingPath: string | null;
  audioLevel: number;
  audioSource: "mic" | "system" | "both";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Speaker icons for visual differentiation
const SPEAKER_ICONS: Record<string, string> = {
  話者0: "🔵",
  話者1: "🟢",
  話者2: "🟡",
  話者3: "🟣",
  話者4: "🔴",
  話者5: "🟠",
};

function getSpeakerIcon(speaker: string): string {
  return SPEAKER_ICONS[speaker] || "⚪";
}

// Generate audio level bar for visualization
function generateLevelBar(level: number): string {
  const barLength = 20;
  const filledLength = Math.round(level * barLength);
  const filled = "█".repeat(filledLength);
  const empty = "░".repeat(barLength - filledLength);
  return `\`${filled}${empty}\``;
}

function generateMarkdown(
  entries: TranscriptionEntry[],
  isRecording: boolean,
  showSpeaker: boolean,
  audioLevel: number,
): string {
  const lines: string[] = [];

  // Header
  lines.push("# 🎙️ Whisper Realtime Transcription");
  lines.push("");

  // Status indicator
  if (isRecording) {
    lines.push("**Status:** 🔴 Recording...");
    lines.push("");
    // Audio level indicator
    lines.push("**Audio Level:**");
    lines.push(generateLevelBar(audioLevel));
  } else if (entries.length > 0) {
    lines.push("**Status:** ⏹️ Stopped");
  } else {
    lines.push("**Status:** ⏸️ Ready");
  }
  lines.push("");

  // Speaker legend (if speaker diarization is enabled)
  if (showSpeaker && entries.length > 0) {
    const speakers = [
      ...new Set(entries.map((e) => e.speaker).filter(Boolean)),
    ];
    if (speakers.length > 0) {
      lines.push(
        "**Speakers:** " +
          speakers.map((s) => `${getSpeakerIcon(s)} ${s}`).join(" | "),
      );
      lines.push("");
    }
  }

  // Transcription content
  if (entries.length === 0) {
    if (isRecording) {
      lines.push("*🎤 Waiting for speech...*");
    } else {
      lines.push("*Press ⌘R to start recording.*");
    }
  } else {
    lines.push("---");
    lines.push("");

    for (const entry of entries) {
      const timestamp = `\`${formatDuration(entry.timestamp)}\``;

      if (showSpeaker && entry.speaker) {
        const icon = getSpeakerIcon(entry.speaker);
        if (entry.isFinal) {
          lines.push(
            `${timestamp} ${icon} **${entry.speaker}**: ${entry.text}`,
          );
        } else {
          lines.push(
            `${timestamp} ${icon} **${entry.speaker}**: *${entry.text}* _(typing...)_`,
          );
        }
      } else {
        if (entry.isFinal) {
          lines.push(`${timestamp} ${entry.text}`);
        } else {
          lines.push(`${timestamp} *${entry.text}* _(typing...)_`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export default function StartTranscription() {
  const preferences = getPreferenceValues<WhisperPreferences>();

  const [state, setState] = useState<TranscriptionState>({
    entries: [],
    isRecording: false,
    status: "Ready",
    error: null,
    recordingPath: null,
    audioLevel: 0,
    audioSource: preferences.audioSource || "mic",
  });

  const startRecording = useCallback(async () => {
    try {
      // Check if whisper-realtime path is configured
      if (!preferences.whisperRealtimePath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Required",
          message:
            "Please set the whisper-realtime path in extension preferences",
        });
        return;
      }

      const process = getWhisperProcess();

      // Clear previous entries
      process.clear();

      // Set up event listeners
      process.removeAllListeners();

      process.on("update", (entries: TranscriptionEntry[]) => {
        setState((prev) => ({
          ...prev,
          entries: [...entries],
        }));
      });

      process.on(
        "status",
        ({ status, message }: { status: string; message: string }) => {
          setState((prev) => ({
            ...prev,
            status: message || status,
          }));

          if (status === "recording") {
            showToast({
              style: Toast.Style.Success,
              title: "Recording Started",
              message: "Speak now...",
            });
          }
        },
      );

      process.on("error", (error: Error) => {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          error: error.message,
        }));
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error.message,
        });
      });

      process.on("close", () => {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          status: "Stopped",
          audioLevel: 0,
        }));
      });

      process.on("level", (level: number) => {
        setState((prev) => ({
          ...prev,
          audioLevel: level,
        }));
      });

      // Generate recording path if recording is enabled
      let recordingPath: string | null = null;
      if (preferences.enableRecording) {
        const outputDir =
          preferences.outputDirectory ||
          path.join(environment.supportPath, "recordings");
        const expandedPath = outputDir.replace(/^~/, os.homedir());

        // Create directory if it doesn't exist
        if (!fs.existsSync(expandedPath)) {
          fs.mkdirSync(expandedPath, { recursive: true });
        }

        recordingPath = path.join(expandedPath, generateRecordingFilename());
      }

      // Start the process with options
      const startOptions: StartOptions = {
        recordingPath: recordingPath || undefined,
        audioSource: state.audioSource,
      };
      process.start(startOptions);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        status: "Starting...",
        error: null,
        recordingPath,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        error: message,
      }));
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to start",
        message,
      });
    }
  }, [
    preferences.whisperRealtimePath,
    preferences.enableRecording,
    preferences.outputDirectory,
    state.audioSource,
  ]);

  const stopRecording = useCallback(async () => {
    const process = getWhisperProcess();
    const recordingPath = process.getRecordingPath();
    process.stop();

    setState((prev) => ({
      ...prev,
      isRecording: false,
      status: "Stopping...",
    }));

    // Show recording path in toast if recording was enabled
    if (recordingPath) {
      await showToast({
        style: Toast.Style.Success,
        title: "Recording Stopped",
        message: `Audio saved to ${path.basename(recordingPath)}`,
      });
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    const process = getWhisperProcess();
    const text = process.getFullText(false); // Exclude partial

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to copy",
        message: "No transcription available",
      });
      return;
    }

    await Clipboard.copy(text);
    await showHUD("Copied to clipboard");
  }, []);

  const saveToFile = useCallback(async () => {
    const process = getWhisperProcess();
    const text = process.getFullText(false);

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to save",
        message: "No transcription available",
      });
      return;
    }

    const outputDir =
      preferences.outputDirectory ||
      path.join(environment.supportPath, "transcriptions");

    // Create directory if it doesn't exist
    const expandedPath = outputDir.replace(/^~/, os.homedir());
    if (!fs.existsSync(expandedPath)) {
      fs.mkdirSync(expandedPath, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `transcription-${timestamp}.txt`;
    const filepath = path.join(expandedPath, filename);

    fs.writeFileSync(filepath, text, "utf-8");

    await showToast({
      style: Toast.Style.Success,
      title: "Saved",
      message: filepath,
    });
  }, [preferences.outputDirectory]);

  const clearTranscription = useCallback(() => {
    const process = getWhisperProcess();
    process.clear();
    setState((prev) => ({
      ...prev,
      entries: [],
    }));
  }, []);

  const setAudioSource = useCallback((source: "mic" | "system" | "both") => {
    setState((prev) => ({
      ...prev,
      audioSource: source,
    }));
    showToast({
      style: Toast.Style.Success,
      title: "Audio Source Changed",
      message: `Now using: ${source === "mic" ? "Microphone" : source === "system" ? "System Audio" : "Both"}`,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't reset process on unmount, let it continue in background
    };
  }, []);

  const markdown = generateMarkdown(
    state.entries,
    state.isRecording,
    preferences.enableSpeaker,
    state.audioLevel,
  );

  return (
    <Detail
      markdown={markdown}
      isLoading={state.status === "Starting..."}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={state.isRecording ? "Recording" : "Stopped"}
            icon={state.isRecording ? Icon.Microphone : Icon.Stop}
          />
          <Detail.Metadata.Label
            title="Model"
            text={preferences.model || "large-v3-turbo"}
          />
          <Detail.Metadata.Label
            title="Language"
            text={preferences.language || "ja"}
          />
          <Detail.Metadata.Label
            title="Speaker Diarization"
            text={preferences.enableSpeaker ? "Enabled" : "Disabled"}
          />
          <Detail.Metadata.Label
            title="Audio Source"
            text={
              state.audioSource === "mic"
                ? "Microphone"
                : state.audioSource === "system"
                  ? "System Audio"
                  : "Both"
            }
          />
          <Detail.Metadata.Label
            title="Processing"
            text={`Step: ${preferences.processingStep || "500"}ms / Window: ${preferences.processingLength || "3000"}ms`}
          />
          <Detail.Metadata.Label
            title="VAD"
            text={preferences.enableVad !== false ? "Enabled" : "Disabled"}
          />
          <Detail.Metadata.Label
            title="Audio Recording"
            text={preferences.enableRecording ? "Enabled" : "Disabled"}
            icon={preferences.enableRecording ? Icon.Music : undefined}
          />
          {state.recordingPath && (
            <Detail.Metadata.Label
              title="Recording File"
              text={path.basename(state.recordingPath)}
              icon={Icon.Document}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Entries"
            text={`${state.entries.filter((e) => e.isFinal).length} confirmed`}
          />
          {state.error && (
            <Detail.Metadata.Label
              title="Error"
              text={state.error}
              icon={Icon.Warning}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Recording">
            {state.isRecording ? (
              <Action
                title="Stop Recording"
                icon={Icon.Stop}
                onAction={stopRecording}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            ) : (
              <Action
                title="Start Recording"
                icon={Icon.Microphone}
                onAction={startRecording}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Output">
            <Action
              title="Copy to Clipboard"
              icon={Icon.Clipboard}
              onAction={copyToClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Save to File"
              icon={Icon.Document}
              onAction={saveToFile}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Audio Source">
            <Action
              title="Use Microphone"
              icon={
                state.audioSource === "mic" ? Icon.CheckCircle : Icon.Microphone
              }
              onAction={() => setAudioSource("mic")}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action
              title="Use System Audio"
              icon={
                state.audioSource === "system" ? Icon.CheckCircle : Icon.Speaker
              }
              onAction={() => setAudioSource("system")}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action
              title="Use Both"
              icon={
                state.audioSource === "both" ? Icon.CheckCircle : Icon.SpeakerOn
              }
              onAction={() => setAudioSource("both")}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action
              title="Clear Transcription"
              icon={Icon.Trash}
              onAction={clearTranscription}
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
