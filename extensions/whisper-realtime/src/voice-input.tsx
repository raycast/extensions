import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getWhisperProcess,
  resetWhisperProcess,
  killAllWhisperProcesses,
  TranscriptionEntry,
  WhisperPreferences,
  StartOptions,
} from "./utils/whisper";

interface VoiceInputState {
  text: string;
  isRecording: boolean;
  status: string;
  error: string | null;
  audioLevel: number;
  spectrum: number[];
}

export default function VoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    text: "",
    isRecording: false,
    status: "Starting...",
    error: null,
    audioLevel: 0,
    spectrum: [0, 0, 0, 0, 0, 0, 0, 0],
  });

  const preferences = getPreferenceValues<WhisperPreferences>();
  const hasStarted = useRef(false);

  // Auto-start recording when component mounts
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const startRecording = async () => {
      try {
        if (!preferences.whisperRealtimePath) {
          setState((prev) => ({
            ...prev,
            error:
              "Please set the whisper-realtime path in extension preferences",
            status: "Error",
          }));
          await showToast({
            style: Toast.Style.Failure,
            title: "Configuration Required",
            message: "Set whisper-realtime path in preferences",
          });
          return;
        }

        // Kill any zombie processes first
        await killAllWhisperProcesses();

        // Reset any existing process for fresh voice input
        resetWhisperProcess();
        const process = getWhisperProcess();

        process.on("update", (entries: TranscriptionEntry[]) => {
          // Combine all text entries
          const fullText = entries
            .map((e) => e.text)
            .filter(Boolean)
            .join("");
          setState((prev) => ({
            ...prev,
            text: fullText,
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
              setState((prev) => ({
                ...prev,
                isRecording: true,
                status: "🎤 Listening...",
              }));
            }
          },
        );

        process.on("error", (error: Error) => {
          console.error("Voice Input error:", error);
          setState((prev) => ({
            ...prev,
            isRecording: false,
            error: error.message,
            status: "Error",
          }));
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error.message,
          });
        });

        process.on("close", (code: number | null) => {
          console.log("Voice Input: Process closed with code:", code);
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

        process.on("spectrum", (spectrum: number[]) => {
          setState((prev) => ({
            ...prev,
            spectrum: spectrum,
          }));
        });

        // Use voice-single command for better accuracy (same as whisper-realtime voice)
        const startOptions: StartOptions = {
          useVoiceSingle: true, // Use voice-single for AquaVoice-style input
        };

        process.start(startOptions);

        // Check if process actually started
        const isRunning = process.getIsRunning();
        await showToast({
          style: isRunning ? Toast.Style.Success : Toast.Style.Failure,
          title: isRunning ? "🎤 Recording" : "Failed to start",
          message: isRunning
            ? "Speak now... (Enter to finish)"
            : "Process did not start",
        });

        setState({
          text: "",
          isRecording: true,
          status: "🎤 Listening...",
          error: null,
          audioLevel: 0,
          spectrum: [0, 0, 0, 0, 0, 0, 0, 0],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: message,
          status: "Error",
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "Error in startRecording",
          message: message,
        });
      }
    };

    startRecording();

    // Cleanup on unmount
    return () => {
      const process = getWhisperProcess();
      if (process.getIsRunning()) {
        process.stop();
      }
      // Also kill any zombie processes
      killAllWhisperProcesses();
    };
  }, [preferences.whisperRealtimePath]);

  const typeAndClose = useCallback(async () => {
    const process = getWhisperProcess();

    // Get text including partial (since FINAL might not arrive yet)
    let finalText = process.getFullText(true);

    // Stop the process
    process.stop();

    // Wait a bit for FINAL to arrive
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Try to get final text again
    const textAfterStop = process.getFullText(true);
    if (textAfterStop) {
      finalText = textAfterStop;
    }

    if (!finalText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to type",
        message: "No speech detected",
      });
      await popToRoot();
      return;
    }

    // Show what we're about to paste
    await showToast({
      style: Toast.Style.Success,
      title: "Pasting text",
      message: finalText.substring(0, 30) + "...",
    });

    // Close Raycast window first to return focus to the previous app
    await closeMainWindow();

    // Small delay to ensure window is closed and focus is returned
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Use paste instead of AppleScript for reliability
    await Clipboard.paste(finalText);

    // Clean up and reset state
    resetWhisperProcess();
    await killAllWhisperProcesses();

    // Reset the transcription state
    setState({
      text: "",
      isRecording: false,
      status: "Ready",
      error: null,
      audioLevel: 0,
      spectrum: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  }, []);

  const pasteAndClose = useCallback(async () => {
    const process = getWhisperProcess();
    process.stop();

    // Get final text (excluding partial)
    const finalText = process.getFullText(false);

    if (!finalText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to paste",
        message: "No speech detected",
      });
      await popToRoot();
      return;
    }

    // Close Raycast window first to return focus to the previous app
    await closeMainWindow();

    // Small delay to ensure window is closed and focus is returned
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Paste the text to the frontmost application
    await Clipboard.paste(finalText);

    // Clean up
    resetWhisperProcess();
    await killAllWhisperProcesses();
  }, []);

  const cancelAndClose = useCallback(async () => {
    const process = getWhisperProcess();
    process.stop();
    resetWhisperProcess();
    await killAllWhisperProcesses();
    await popToRoot();
  }, []);

  const copyToClipboard = useCallback(async () => {
    const process = getWhisperProcess();
    process.stop();

    const finalText = process.getFullText(false);

    if (!finalText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to copy",
        message: "No speech detected",
      });
      resetWhisperProcess();
      await killAllWhisperProcesses();
      await popToRoot();
      return;
    }

    await Clipboard.copy(finalText);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });

    resetWhisperProcess();
    await killAllWhisperProcesses();
    await popToRoot();
  }, []);

  const resetAndRestart = useCallback(async () => {
    // Stop current process
    const process = getWhisperProcess();
    process.stop();

    // Kill all zombie processes
    resetWhisperProcess();
    await killAllWhisperProcesses();

    // Reset state
    setState({
      text: "",
      isRecording: false,
      status: "Resetting...",
      error: null,
      audioLevel: 0,
      spectrum: [0, 0, 0, 0, 0, 0, 0, 0],
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Reset complete",
      message: "Ready to record again",
    });

    // Reset hasStarted to allow restarting
    hasStarted.current = false;

    // Restart recording after a short delay
    setTimeout(() => {
      // Trigger re-render to restart
      setState((prev) => ({ ...prev, status: "Ready" }));
    }, 500);
  }, []);

  // Generate audio level bar for visualization
  const generateLevelBar = (level: number) => {
    const barLength = 20;
    const filledLength = Math.round(level * barLength);
    const filled = "█".repeat(filledLength);
    const empty = "░".repeat(barLength - filledLength);
    return `\`${filled}${empty}\``;
  };

  // Generate compact markdown for voice input
  const generateMarkdown = () => {
    const lines: string[] = [];

    lines.push("# 🎙️ Voice Input");
    lines.push("");

    if (state.error) {
      lines.push(`**Error:** ${state.error}`);
    } else if (state.isRecording) {
      lines.push(`**${state.status}**`);
      lines.push("");

      // Audio level indicator
      lines.push("**Audio Level:**");
      lines.push(generateLevelBar(state.audioLevel));
      lines.push("");

      if (state.text) {
        lines.push("---");
        lines.push("");
        lines.push(`> ${state.text}`);
      } else {
        lines.push("*Speak now...*");
      }

      lines.push("");
      lines.push("---");
      lines.push("");
      lines.push(
        "**⏎** Type • **⌘V** Paste • **⌘C** Copy • **⌘R** Reset • **Esc** Cancel",
      );
    } else {
      lines.push(`**Status:** ${state.status}`);
      if (state.text) {
        lines.push("");
        lines.push(`> ${state.text}`);
      }
    }

    return lines.join("\n");
  };

  return (
    <Detail
      markdown={generateMarkdown()}
      isLoading={state.status === "Starting..."}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Input">
            <Action
              title="Type Text"
              icon={Icon.Text}
              onAction={typeAndClose}
            />
            <Action
              title="Paste Text"
              icon={Icon.Clipboard}
              onAction={pasteAndClose}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action
              title="Copy to Clipboard"
              icon={Icon.CopyClipboard}
              onAction={copyToClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Reset"
              icon={Icon.ArrowClockwise}
              onAction={resetAndRestart}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={cancelAndClose}
              shortcut={{ modifiers: [], key: "escape" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
