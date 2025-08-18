import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  List,
  Detail,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { transcribeAudio } from "./utils/openai";
import {
  copyAndPaste,
  copyToClipboard,
  formatTranscriptionText,
} from "./utils/clipboard";
import { formatTextWithChatGPT } from "./utils/formatters";
import {
  Preferences,
  TranscriptionState,
  FormatMode,
  TranscriptionData,
} from "./types";
import { formatDuration } from "./utils/time";
import { getErrorMessage, showErrorToast } from "./utils/errors";
import { saveTranscription } from "./utils/audio";

export default function Dictate() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    isRecording,
    recordingDuration,
    recordingPath,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const [transcriptionState, setTranscriptionState] =
    useState<TranscriptionState>("idle");
  const [transcription, setTranscription] = useState<string>("");
  const [formattedText, setFormattedText] = useState<string>("");
  const [currentFormat, setCurrentFormat] = useState<FormatMode>("original");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");

  // Auto-start recording when component loads
  useEffect(() => {
    const autoStart = async () => {
      try {
        setTranscriptionState("recording");
        await startRecording();
        await showToast({
          style: Toast.Style.Success,
          title: "Recording Started",
          message: "Speak now. Press Enter to stop and transcribe.",
        });
      } catch (err) {
        setTranscriptionState("error");
        const errorMsg = getErrorMessage(err);
        setErrorMessage(errorMsg);
        await showErrorToast("Error starting recording", err);
      }
    };

    autoStart();
  }, []);

  // Auto-transcribe when recording stops
  useEffect(() => {
    const autoTranscribe = async () => {
      if (!isRecording && recordingPath && transcriptionState === "recording") {
        setTranscriptionState("transcribing");

        try {
          await showToast({
            style: Toast.Style.Animated,
            title: "Transcribing...",
            message: "Processing with " + preferences.model,
          });

          const result = await transcribeAudio(recordingPath);
          const formattedResult = formatTranscriptionText(result);
          setTranscription(formattedResult);

          // Save the transcription to JSON file
          const transcriptionData: TranscriptionData = {
            transcription: formattedResult,
            wordCount: formattedResult.split(/\s+/).length,
            transcribedAt: new Date().toISOString(),
            model: preferences.model,
            language: preferences.language,
            formatMode: currentFormat,
          };

          try {
            await saveTranscription(recordingPath, transcriptionData);
          } catch (saveError) {
            console.error("Failed to save transcription:", saveError);
            // Continue even if save fails
          }

          // If a specific format was selected, format the text
          if (currentFormat !== "original") {
            setTranscriptionState("formatting");
            try {
              const formatted = await formatTextWithChatGPT(
                formattedResult,
                currentFormat,
              );
              setFormattedText(formatted);

              // Update saved transcription with formatted text
              const formattedTranscriptionData: TranscriptionData = {
                ...transcriptionData,
                transcription: formatted,
                wordCount: formatted.split(/\s+/).length,
                formatMode: currentFormat,
              };

              try {
                await saveTranscription(
                  recordingPath,
                  formattedTranscriptionData,
                );
              } catch (saveError) {
                console.error(
                  "Failed to save formatted transcription:",
                  saveError,
                );
              }

              await showToast({
                style: Toast.Style.Success,
                title: "Transcribed and Formatted",
                message: `Ready as ${currentFormat}`,
              });
            } catch (formatErr) {
              setFormattedText(formattedResult);
              await showErrorToast("Formatting Error", formatErr);
            }
          } else {
            setFormattedText(formattedResult);
            await showToast({
              style: Toast.Style.Success,
              title: "Done",
            });

            // Auto-copy, paste, and close for original format (Stop and Transcribe)
            try {
              await copyAndPaste(formattedResult);
              await popToRoot();
              return;
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Paste Error",
                message:
                  "Could not insert text. Text is still available for manual copy/paste.",
              });
              // Keep window open by setting state to completed
              setTranscriptionState("completed");
              setFormattedText(formattedResult);
            }
          }

          setTranscriptionState("completed");
        } catch (err) {
          setTranscriptionState("error");
          const errorMsg = getErrorMessage(err);
          setErrorMessage(errorMsg);
          await showErrorToast("Transcription Error", err);
        }
      }
    };

    autoTranscribe();
  }, [isRecording, recordingPath, transcriptionState, currentFormat]);

  const handleStopAndTranscribe = async () => {
    if (isRecording) {
      await stopRecording();
    }
  };

  const handleStopAndTranscribeWithFormat = async (mode?: FormatMode) => {
    if (isRecording) {
      if (mode) {
        setCurrentFormat(mode);
      }
      await stopRecording();
    }
  };

  const handleFormatText = async (mode: FormatMode) => {
    if (!transcription) return;

    if (mode === "original") {
      setFormattedText(transcription);
      setCurrentFormat("original");
      return;
    }

    setTranscriptionState("formatting");
    setCurrentFormat(mode);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Formatting...",
        message: `Adapting for ${mode}...`,
      });

      const formatted = await formatTextWithChatGPT(transcription, mode);
      setFormattedText(formatted);
      setTranscriptionState("completed");

      await showToast({
        style: Toast.Style.Success,
        title: "Text Formatted",
        message: `Ready to use as ${mode}`,
      });
    } catch (err) {
      setTranscriptionState("completed");
      await showErrorToast("Formatting Error", err);
    }
  };

  const handlePasteToSelectedField = async () => {
    if (formattedText) {
      try {
        await copyAndPaste(formattedText);
        await popToRoot();
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Paste Error",
          message: "Could not insert text",
        });
      }
    }
  };

  const handleCopyAgain = async () => {
    if (formattedText) {
      await copyToClipboard(formattedText, "Copied to clipboard");
    }
  };

  const handleCancelRecording = async () => {
    if (isRecording) {
      await stopRecording();
    }
    await popToRoot();
  };

  const handleNewRecording = async () => {
    setTranscriptionState("recording");
    setTranscription("");
    setFormattedText("");
    setCurrentFormat("original");
    setErrorMessage("");
    await startRecording();
  };

  const getSearchPlaceholder = (): string => {
    if (transcriptionState === "recording") {
      return `Recording ${formatDuration(recordingDuration)}`;
    }
    if (transcriptionState === "transcribing") {
      return "Transcribing...";
    }
    if (transcriptionState === "formatting") {
      return "Formatting...";
    }
    return "Type to search options...";
  };

  const getNavigationTitle = (): string => {
    switch (transcriptionState) {
      case "recording":
        return "Listening...";
      case "transcribing":
        return "Transcribing...";
      case "formatting":
        return `Formatting`;
      case "completed":
        return "Done";
      case "error":
        return "Error";
      default:
        return "Dictate";
    }
  };

  const formatModes = [
    {
      id: "slack",
      title: "Slack Message",
      subtitle: "Format for Slack communication",
      icon: Icon.Message,
      description: "Optimized for Slack messages with proper formatting",
      keywords: ["slack", "chat", "message", "communication", "team"],
    },
    {
      id: "email",
      title: "Email Format",
      subtitle: "Email formatting",
      icon: Icon.Envelope,
      description: "Structured for email communication",
      keywords: ["email", "mail", "professional", "business", "formal"],
    },
    {
      id: "report",
      title: "Report Format",
      subtitle: "Detailed report structure",
      icon: Icon.Document,
      description: "Formatted as a structured report or document",
      keywords: ["report", "document", "formal", "structure", "detailed"],
    },
  ];

  // Show results view after transcription is completed
  if (transcriptionState === "completed") {
    const markdown = formattedText;

    return (
      <Detail
        navigationTitle="Transcription Result"
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Paste to Selected Field"
              onAction={handlePasteToSelectedField}
              icon={Icon.Pencil}
            />
            <Action
              title="Copy to Clipboard"
              onAction={handleCopyAgain}
              icon={Icon.Clipboard}
            />
            <Action
              title="Format as Email"
              onAction={() => handleFormatText("email")}
              icon={Icon.Envelope}
            />
            <Action
              title="Format for Slack"
              onAction={() => handleFormatText("slack")}
              icon={Icon.Message}
            />
            <Action
              title="Format as Report"
              onAction={() => handleFormatText("report")}
              icon={Icon.Document}
            />
            <Action
              title="Use Original"
              onAction={() => handleFormatText("original")}
              icon={Icon.Pencil}
            />
            <Action
              title="New Recording"
              onAction={handleNewRecording}
              icon={Icon.Microphone}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show error view
  if (transcriptionState === "error") {
    return (
      <List navigationTitle="Error">
        <List.Item
          title="Error"
          icon={Icon.XMarkCircle}
          subtitle={errorMessage}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={handleNewRecording}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show recording/processing interface
  return (
    <List
      navigationTitle={getNavigationTitle()}
      isLoading={
        transcriptionState === "transcribing" ||
        transcriptionState === "formatting"
      }
      searchBarPlaceholder={getSearchPlaceholder()}
      filtering={transcriptionState === "recording"}
      searchText={transcriptionState === "recording" ? searchText : ""}
      onSearchTextChange={(text) => {
        if (transcriptionState === "recording") {
          setSearchText(text);
        }
      }}
    >
      {transcriptionState === "recording" ? (
        <>
          <List.Item
            icon={Icon.Stop}
            title="Stop Recording"
            subtitle="Stop and transcribe with original format"
            keywords={["stop", "original", "transcribe", "finish"]}
            accessories={[{ text: "Press Enter" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Stop and Transcribe"
                  onAction={handleStopAndTranscribe}
                  icon={Icon.Stop}
                />
                <Action
                  title="Cancel Recording"
                  onAction={handleCancelRecording}
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
          {formatModes.map((mode) => (
            <List.Item
              key={mode.id}
              icon={mode.icon}
              title={mode.title}
              subtitle={mode.subtitle}
              keywords={mode.keywords}
              accessories={[{ text: "Press Enter" }]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Stop & Format as ${mode.title}`}
                    onAction={() =>
                      handleStopAndTranscribeWithFormat(mode.id as FormatMode)
                    }
                    icon={mode.icon}
                  />
                  <Action
                    title="Cancel Recording"
                    onAction={handleCancelRecording}
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView
          icon={Icon.Clock}
          title="Processing..."
          description="Please wait while we process your recording"
        />
      )}
    </List>
  );
}
