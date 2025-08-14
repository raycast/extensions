import React, { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  open,
} from "@raycast/api";
import { processText } from "./lib/ai";

interface Preferences {
  openaiApiKey: string;
  openrouterApiKey: string;
  defaultModel: string;
  temperature: string;
  maxTokens: string;
  customSystemPrompt: string;
  voiceModel: string;
}

export default function VoiceCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [isProcessing, setIsProcessing] = useState(false);

  const openSystemPreferences = () => {
    open(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
    );
  };

  const openMicrophoneSettings = () => {
    showToast(Toast.Style.Success, "Opening System Preferences...");
    openSystemPreferences();
  };

  const showRecordingInstructions = () => {
    showToast(
      Toast.Style.Success,
      "Voice recording instructions",
      "Use macOS QuickTime or Voice Memos to record audio, then paste the file path here",
    );
  };

  const transcribeFromFile = async () => {
    if (!preferences.openaiApiKey && !preferences.openrouterApiKey) {
      showToast(Toast.Style.Failure, "Please configure API keys in settings");
      return;
    }

    setIsProcessing(true);
    showToast(Toast.Style.Animated, "Processing audio file...");

    try {
      // For now, we'll show instructions on how to use external recording tools
      showToast(
        Toast.Style.Success,
        "Voice-to-text feature",
        "Due to Raycast limitations, please use macOS built-in recording tools and paste the audio file path",
      );
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Error processing audio",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <List>
      <List.Section title="Voice to Text">
        <List.Item
          title="Recording Instructions"
          subtitle="Learn how to record audio for transcription"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action
                title="Show Instructions"
                onAction={showRecordingInstructions}
                icon={Icon.Info}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Microphone Permissions"
          subtitle="Configure microphone access in System Preferences"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action
                title="Open System Preferences"
                onAction={openMicrophoneSettings}
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Record with QuickTime"
          subtitle="Use macOS QuickTime to record audio"
          icon={Icon.Video}
          actions={
            <ActionPanel>
              <Action
                title="Open Quicktime"
                onAction={() => open("quicktime://")}
                icon={Icon.Video}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Record with Voice Memos"
          subtitle="Use macOS Voice Memos app"
          icon={Icon.Microphone}
          actions={
            <ActionPanel>
              <Action
                title="Open Voice Memos"
                onAction={() => open("voicememos://")}
                icon={Icon.Microphone}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Transcribe Audio File"
          subtitle="Process an existing audio file"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Process Audio File"
                onAction={transcribeFromFile}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Instructions">
        <List.Item
          title="How to Use Voice-to-Text"
          subtitle="1. Record audio using QuickTime or Voice Memos 2. Save the file 3. Use the transcription command"
          icon={Icon.QuestionMark}
        />

        <List.Item
          title="Supported Audio Formats"
          subtitle="MP3, WAV, M4A, WebM, and other common formats"
          icon={Icon.Document}
        />

        <List.Item
          title="API Requirements"
          subtitle="OpenAI API key required for transcription"
          icon={Icon.Key}
        />
      </List.Section>

      {isProcessing && (
        <List.Item
          title="Processing..."
          subtitle="Please wait while we process your audio"
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}
