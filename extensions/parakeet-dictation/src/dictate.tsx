import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Clipboard,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { AudioRecorder } from "./utils/audio-recorder";
import { ParakeetClient } from "./utils/parakeet-client";
import { SetupChecker } from "./utils/setup-checker";
import { TextFormatter } from "./utils/text-formatter";
import { RecordingState, TranscriptionResult } from "./types/transcription";
import {
  Preferences,
  getNumericPreference,
  getSampleRate,
} from "./types/preferences";
import SetupCommand from "./setup";

export default function Dictate() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<RecordingState>(RecordingState.IDLE);
  const [recorder, setRecorder] = useState<AudioRecorder | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupIssue, setSetupIssue] = useState<string | null>(null);

  // Check setup and auto-start recording on mount
  useEffect(() => {
    const init = async () => {
      await checkSetup();
      // Auto-start recording if setup is complete
      if (!setupIssue) {
        startRecording();
      }
    };
    init();

    // Cleanup on unmount
    return () => {
      if (recorder && recorder.isRecording()) {
        recorder.cancel();
      }
      AudioRecorder.cleanupAll();
    };
  }, []);

  // Update duration timer
  useEffect(() => {
    if (state === RecordingState.RECORDING && recorder) {
      const interval = setInterval(() => {
        setDuration(recorder.getDuration());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state, recorder]);

  const checkSetup = async () => {
    try {
      const status = await SetupChecker.checkAll();
      if (!status.allReady) {
        const issues: string[] = [];
        if (!status.parakeetInstalled)
          issues.push("Parakeet MLX not installed");
        if (!status.soxInstalled && !status.ffmpegInstalled)
          issues.push("No audio recording tool (SoX or FFmpeg)");
        setSetupIssue(issues.join(", "));
      }
    } catch (err) {
      setSetupIssue("Failed to check setup");
    }
  };

  const startRecording = async () => {
    try {
      setState(RecordingState.RECORDING);
      setError(null);
      setDuration(0);

      const status = await SetupChecker.checkAll();
      const useSox = status.soxInstalled;

      const newRecorder = new AudioRecorder(useSox);
      setRecorder(newRecorder);

      const sampleRate = getSampleRate(preferences.audioQuality);
      await newRecorder.start(sampleRate);

      showToast({
        style: Toast.Style.Success,
        title: "Recording started",
        message: "Press Enter to stop",
      });
    } catch (err) {
      setState(RecordingState.ERROR);
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Recording failed",
        message,
      });
    }
  };

  const stopRecording = async () => {
    if (!recorder) return;

    try {
      setState(RecordingState.PROCESSING);
      const audioPath = await recorder.stop();

      showToast({
        style: Toast.Style.Animated,
        title: "Transcribing...",
        message: "Processing audio with Parakeet",
      });

      // Transcribe
      const client = new ParakeetClient({
        chunkDuration: getNumericPreference(preferences.chunkDuration, 120),
        decodingMethod: preferences.decodingMethod,
        debugMode: preferences.debugMode,
      });

      const result = await client.transcribe(
        audioPath,
        preferences.showProgressBar
          ? (progress) => setTranscriptionProgress(progress)
          : undefined,
      );

      // Format text
      const formattedText = TextFormatter.format(result.text, {
        autoCapitalize: preferences.autoCapitalize,
        autoPunctuation: preferences.autoPunctuation,
        addSpaceAfter: preferences.addSpaceAfter,
      });

      result.text = formattedText;
      result.wordCount = TextFormatter.countWords(formattedText);

      setTranscriptionResult(result);
      setState(RecordingState.COMPLETE);

      // Auto-paste
      await autoPaste(formattedText, result.wordCount);

      // Cleanup audio file and JSON output file
      AudioRecorder.cleanup(audioPath);
      // Also cleanup the JSON file that parakeet creates
      const jsonPath = audioPath.replace(/\.wav$/, ".json");
      AudioRecorder.cleanup(jsonPath);
    } catch (err) {
      setState(RecordingState.ERROR);
      const message =
        err instanceof Error ? err.message : "Transcription failed";
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Transcription failed",
        message,
      });
    }
  };

  const autoPaste = async (text: string, wordCount: number) => {
    try {
      await Clipboard.paste(text);
      await showHUD(`✓ Pasted ${wordCount} word${wordCount !== 1 ? "s" : ""}`);
    } catch (err) {
      // Fallback to clipboard copy if paste fails
      await Clipboard.copy(text);
      await showHUD(
        `✓ Copied ${wordCount} word${wordCount !== 1 ? "s" : ""} to clipboard`,
      );
    }
  };

  const cancelRecording = () => {
    if (recorder) {
      recorder.cancel();
    }
    setState(RecordingState.IDLE);
    setDuration(0);
    setError(null);
    setTranscriptionResult(null);
  };

  const restart = () => {
    setState(RecordingState.IDLE);
    setDuration(0);
    setError(null);
    setTranscriptionResult(null);
    setTranscriptionProgress(0);
    startRecording();
  };

  // Render based on state
  if (setupIssue && state === RecordingState.IDLE) {
    return (
      <Detail
        markdown={`# Setup Required\n\n⚠️ **${setupIssue}**\n\nPlease run the **Setup Dependencies** command to install missing requirements.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Setup"
              target={<Setup />}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action
              title="Recheck"
              onAction={checkSetup}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === RecordingState.IDLE) {
    // Show loading state while initializing
    return <Detail isLoading={true} markdown="# Starting Recording..." />;
  }

  if (state === RecordingState.RECORDING) {
    const maxDuration = getNumericPreference(
      preferences.maxRecordingDuration,
      600,
    );
    const progress = (duration / maxDuration) * 100;

    const markdown = [
      "# 🔴 Recording",
      "",
      `**Duration**: ${TextFormatter.formatDuration(duration)}`,
      "",
      duration > 120 && preferences.showProgressBar
        ? `**Progress**: ${Math.min(progress, 100).toFixed(0)}%`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Stop Recording"
              onAction={stopRecording}
              icon={Icon.Stop}
              shortcut={{ modifiers: [], key: "return" }}
            />
            <Action
              title="Cancel"
              onAction={cancelRecording}
              icon={Icon.Xmark}
              shortcut={{ modifiers: [], key: "escape" }}
              style={Action.Style.Destructive}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === RecordingState.PROCESSING) {
    const markdown = [
      "# ⏳ Transcribing",
      "",
      "Processing audio with Parakeet...",
      "",
      preferences.showProgressBar && transcriptionProgress > 0
        ? `**Progress**: ${transcriptionProgress}%`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return <Detail isLoading={true} markdown={markdown} />;
  }

  if (state === RecordingState.ERROR) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error || "An unknown error occurred"}`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              onAction={restart}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Cancel"
              onAction={cancelRecording}
              icon={Icon.Xmark}
              shortcut={{ modifiers: [], key: "escape" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === RecordingState.COMPLETE && transcriptionResult) {
    const markdown = [
      "# ✓ Transcription Complete",
      "",
      `**Words**: ${transcriptionResult.wordCount}`,
      `**Duration**: ${TextFormatter.formatDuration(duration)}`,
      "",
      "---",
      "",
      transcriptionResult.text,
    ].join("\n");

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="New Recording"
              onAction={restart}
              icon={Icon.Microphone}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              title="Copy Text"
              content={transcriptionResult.text}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Done"
              onAction={cancelRecording}
              icon={Icon.Check}
              shortcut={{ modifiers: [], key: "escape" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown="# Unknown State" />;
}

// Import Setup component for inline use
function Setup() {
  return <SetupCommand />;
}
