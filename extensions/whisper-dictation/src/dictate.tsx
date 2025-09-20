import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  closeMainWindow,
  Icon,
  Detail,
  getPreferenceValues,
  environment,
  LocalStorage,
  launchCommand,
  LaunchType,
  showHUD,
  openExtensionPreferences,
  PopToRootType,
  List,
  Color,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import type { ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
// Import custom hooks
import { useConfiguration } from "./hooks/useConfiguration";
import { useRecording } from "./hooks/useRecording";
import { useTranscription } from "./hooks/useTranscription";
import { useAIRefinement } from "./hooks/useAIRefinement";

interface TranscriptionHistoryItem {
  id: string;
  timestamp: number;
  text: string;
}

// Paths
const AUDIO_FILE_PATH = path.join(environment.supportPath, "raycast_dictate_audio.wav");
const HISTORY_STORAGE_KEY = "dictationHistory";

const AI_PROMPTS_KEY = "aiPrompts";
const ACTIVE_PROMPT_ID_KEY = "activePromptId";
interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
}

// Define states
type CommandState =
  | "configuring"
  | "configured_waiting_selection"
  | "selectingPrompt"
  | "idle"
  | "recording"
  | "transcribing"
  | "done"
  | "error";
interface Config {
  execPath: string;
  modelPath: string;
  soxPath: string;
}

export default function DictateWithAICommand() {
  const [state, setState] = useState<CommandState>("configuring");
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [aiErrorMessage, setAiErrorMessage] = useState<string>("");
  const [selectedSessionPrompt, setSelectedSessionPrompt] = useState<AIPrompt | null>(null);
  const [skipAIForSession, setSkipAIForSession] = useState<boolean>(false);
  const soxProcessRef = useRef<ChildProcessWithoutNullStreams | null>(null);
  const [waveformSeed, setWaveformSeed] = useState<number>(0);
  const [config, setConfig] = useState<Config | null>(null);

  const preferences = getPreferenceValues<Preferences>();
  const DEFAULT_ACTION = preferences.defaultAction || "none";
  const [prompts] = useCachedState<AIPrompt[]>(AI_PROMPTS_KEY, []);
  const [activePromptId] = useCachedState<string>(ACTIVE_PROMPT_ID_KEY, "default");

  // Get refineText function from hook
  const { refineText } = useAIRefinement(setAiErrorMessage);

  // Cleanup function for audio file only
  const cleanupAudioFile = useCallback(() => {
    fs.promises
      .unlink(AUDIO_FILE_PATH)
      .then(() => console.log("Cleaned up audio file."))
      .catch((err) => {
        if (err.code !== "ENOENT") {
          // Ignore if file doesn't exist
          console.error("Error cleaning up audio file:", err.message);
        }
      });
  }, []);

  // Initialize and validate configuration
  useConfiguration(setState, setConfig, setErrorMessage);

  const { restartRecording, currentRefinementPrompt, isRefinementActive } = useRecording(
    state,
    config,
    setState,
    setErrorMessage,
    soxProcessRef,
  );

  // Handle prompt selection
  const handlePromptSelection = useCallback(
    async (promptId: string) => {
      const selectedPrompt = prompts.find((p) => p.id === promptId);
      if (selectedPrompt) {
        setSelectedSessionPrompt(selectedPrompt);
        // Set the selected prompt as active for this session
        await LocalStorage.setItem("activePromptId", promptId);
        setState("idle");
      }
    },
    [prompts],
  );

  // Handle prompt selection cancellation
  const handlePromptSelectionCancel = useCallback(() => {
    setSelectedSessionPrompt(null);
    setState("idle");

    // Stop any ongoing dictation process
    const processToStop = soxProcessRef.current;
    if (processToStop && !processToStop.killed) {
      try {
        process.kill(processToStop.pid!, "SIGKILL"); // Immediate stop
        console.log(`handlePromptSelectionCancel: Sent SIGKILL to PID ${processToStop.pid}`);
      } catch {
        /* Ignore ESRCH */
      }
      soxProcessRef.current = null;
    }

    // Clean up audio file
    cleanupAudioFile();

    // Close the Raycast window
    closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }, [cleanupAudioFile]);

  // Handle skipping AI refinement entirely for current session
  const handleSkipAIRefinement = useCallback(() => {
    setSkipAIForSession(true);
    setSelectedSessionPrompt(null);
    setState("idle");
  }, []);

  // Handle skipping prompt selection, will use currently active prompt or first prompt
  const handleSkipAndUseActivePrompt = useCallback(async () => {
    try {
      // Get active prompt ID from LocalStorage
      const activePromptId = (await LocalStorage.getItem<string>("activePromptId")) || "default";

      // Find active prompt in the prompts list
      const activePrompt = prompts.find((p) => p.id === activePromptId);

      if (activePrompt) {
        setSelectedSessionPrompt(activePrompt);
        await LocalStorage.setItem("activePromptId", activePromptId);
        setState("idle");
      } else {
        // Fallback to first prompt if active prompt not found
        if (prompts.length > 0) {
          setSelectedSessionPrompt(prompts[0]);
          await LocalStorage.setItem("activePromptId", prompts[0].id);
          setState("idle");
        } else {
          // No prompts available, won't use any prompt
          setState("idle");
        }
      }
    } catch (error) {
      console.error("Failed to get active prompt:", error);
      // Fallback to proceed without prompt
      setState("idle");
    }
  }, [prompts]);
  // Effect for waveform animation
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (state === "recording") {
      intervalId = setInterval(() => {
        setWaveformSeed((prev) => prev + 1);
      }, 150);
    }
    // Cleanup interval on unmount or when state changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state]);

  // Effect to handle prompt selection after configuration
  useEffect(() => {
    if (state === "configured_waiting_selection" && config) {
      const shouldShowPromptSelection =
        preferences.aiRefinementMethod !== "disabled" && preferences.promptBeforeDictation;

      if (shouldShowPromptSelection) {
        if (prompts.length === 0) {
          setState("selectingPrompt");
        } else if (prompts.length === 1) {
          handlePromptSelection(prompts[0].id);
        } else {
          setState("selectingPrompt");
        }
      } else {
        setState("idle");
      }
    }
  }, [
    state,
    config,
    preferences.aiRefinementMethod,
    preferences.promptBeforeDictation,
    prompts,
    handlePromptSelection,
    setState,
  ]);

  const saveTranscriptionToHistory = useCallback(async (text: string) => {
    // Don't save empty transcription
    if (!text || text === "[BLANK_AUDIO]" || text === "[PAUSE]") return;

    try {
      const newItem: TranscriptionHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        text: text,
      };

      const existingHistoryString = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
      let history: TranscriptionHistoryItem[] = [];

      if (existingHistoryString) {
        try {
          history = JSON.parse(existingHistoryString);
          if (!Array.isArray(history)) {
            console.warn("Invalid history data found in LocalStorage, resetting.");
            history = [];
          }
        } catch (parseError) {
          console.error("Failed to parse history from LocalStorage:", parseError);
          await showToast({
            style: Toast.Style.Failure,
            title: "Warning",
            message: "Could not read previous dictation history. Clearing history.",
          });
          history = []; // Reset history if parse fails
        }
      }

      // Add new item to beginning
      history.unshift(newItem);

      // Limit history size
      const MAX_HISTORY_ITEMS = 100;
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }

      await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      console.log("Saved transcription to history.");
    } catch (error) {
      console.error("Failed to save transcription to history:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save transcription to history.",
      });
    }
  }, []);

  // Effect to reset session prompt when AI refinement is disabled
  useEffect(() => {
    if (preferences.aiRefinementMethod === "disabled") {
      setSelectedSessionPrompt(null);
      setSkipAIForSession(false);
    }
  }, [preferences.aiRefinementMethod]);

  // Use transcription hook
  const { startTranscription, handlePasteAndCopy } = useTranscription({
    config,
    preferences,
    setState,
    setErrorMessage,
    setTranscribedText,
    refineText,
    saveTranscriptionToHistory,
    cleanupAudioFile,
    aiErrorMessage,
    skipAIForSession,
  });

  // Function to stop recording and transcribe via hook
  const stopRecordingAndTranscribe = useCallback(async () => {
    console.log(`stopRecordingAndTranscribe called. Current state: ${state}`);

    if (state !== "recording") {
      console.warn(`stopRecordingAndTranscribe: State is '${state}', expected 'recording'. Aborting.`);
      return;
    }

    // Get current process ref before maybe clearing it
    const processToStop = soxProcessRef.current;

    if (processToStop) {
      console.log(`Attempting to stop recording process PID: ${processToStop.pid}...`);
      soxProcessRef.current = null; // Clear ref immediately
      console.log("Cleared sox process ref.");
      try {
        if (!processToStop.killed) {
          // Send SIGTERM first for graceful shutdown
          process.kill(processToStop.pid!, "SIGTERM");
          console.log(`Sent SIGTERM to PID ${processToStop.pid}`);
          // Give it time to die gracefully before transcription starts
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          console.log(`Process ${processToStop.pid} was already killed.`);
        }
      } catch (e) {
        // Handle potential errors (like process already exited - ESRCH)
        if (e instanceof Error && "code" in e && e.code !== "ESRCH") {
          console.warn(`Error stopping sox process PID ${processToStop.pid}:`, e);
        } else {
          console.log(`Process ${processToStop.pid} likely already exited.`);
        }
      }
    } else {
      console.warn("stopRecordingAndTranscribe: No active sox process reference found to stop.");
    }

    // Trigger transcription using hooks function
    await startTranscription();
  }, [state, startTranscription]);

  const generateWaveformMarkdown = useCallback(() => {
    const waveformHeight = 18;
    const waveformWidth = 105;
    let waveform = "```\n"; // Start md code block
    waveform += "RECORDING AUDIO... PRESS ENTER TO STOP\n\n";

    for (let y = 0; y < waveformHeight; y++) {
      let line = "";
      for (let x = 0; x < waveformWidth; x++) {
        const baseAmplitude1 = Math.sin((x / waveformWidth) * Math.PI * 4) * 0.3;
        const baseAmplitude2 = Math.sin((x / waveformWidth) * Math.PI * 8) * 0.15;
        const baseAmplitude3 = Math.sin((x / waveformWidth) * Math.PI * 2) * 0.25;
        const baseAmplitude = baseAmplitude1 + baseAmplitude2 + baseAmplitude3;
        const randomFactor = Math.sin(x + waveformSeed * 0.3) * 0.2;
        const amplitude = baseAmplitude + randomFactor;
        const normalizedAmplitude = (amplitude + 0.7) * waveformHeight * 0.5;
        const distFromCenter = Math.abs(y - waveformHeight / 2);
        const shouldDraw = distFromCenter < normalizedAmplitude;

        if (shouldDraw) {
          const intensity = 1 - distFromCenter / normalizedAmplitude;
          if (intensity > 0.8) line += "█";
          else if (intensity > 0.6) line += "▓";
          else if (intensity > 0.4) line += "▒";
          else if (intensity > 0.2) line += "░";
          else line += "·";
        } else {
          line += " ";
        }
      }
      waveform += line + "\n";
    }
    waveform += "```"; // End md code block
    return waveform;
  }, [waveformSeed]);

  const getActionPanel = useCallback(() => {
    switch (state) {
      case "recording":
        return (
          <ActionPanel>
            <Action title="Stop and Transcribe" icon={Icon.Stop} onAction={stopRecordingAndTranscribe} />
            <Action
              title="Cancel Recording"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => {
                const processToStop = soxProcessRef.current;
                if (processToStop && !processToStop.killed) {
                  try {
                    process.kill(processToStop.pid!, "SIGKILL"); // Immediate stop
                    console.log(`Cancel Recording: Sent SIGKILL to PID ${processToStop.pid}`);
                  } catch {
                    /* Ignore ESRCH */
                  }
                  soxProcessRef.current = null;
                }
                cleanupAudioFile(); // Clean up partial file
                closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              }}
            />
            <Action
              title="Retry Recording"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                console.log("Retry Recording action triggered.");
                cleanupAudioFile();
                restartRecording();
              }}
            />
          </ActionPanel>
        );
      case "done":
        return (
          <ActionPanel>
            <Action.CopyToClipboard
              title={DEFAULT_ACTION === "copy" ? "Copy Text (Default)" : "Copy Text"}
              content={transcribedText}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
              onCopy={() => closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate })} // Close after copy
            />
            <Action.Paste
              title={DEFAULT_ACTION === "paste" ? "Paste Text (Default)" : "Paste Text"}
              content={transcribedText}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onPaste={() => closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate })} // Close after paste
            />
            <Action
              title={DEFAULT_ACTION === "copy_paste" ? "Copy & Paste Text (Default)" : "Copy & Paste Text"}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
              onAction={() => handlePasteAndCopy(transcribedText)}
            />
            <Action
              title="View History"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              onAction={async () => {
                await launchCommand({ name: "dictation-history", type: LaunchType.UserInitiated });
              }}
            />
            <Action title="Close" icon={Icon.XMarkCircle} onAction={closeMainWindow} />
          </ActionPanel>
        );
      case "transcribing":
        // No actions available during transcription
        return null;
      case "error":
        return (
          <ActionPanel>
            {/* Allow to quickly open preferences if config error */}
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={() => {
                openExtensionPreferences();
                closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              }}
            />
            <Action
              title="Retry (Reopen Command)"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                showHUD("Please reopen the Dictate Text command.");
                closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              }}
            />
            <Action
              title="Download Model"
              icon={Icon.Download}
              onAction={async () => {
                await launchCommand({ name: "download-model", type: LaunchType.UserInitiated });
              }}
            />
            <Action title="Close" icon={Icon.XMarkCircle} onAction={closeMainWindow} />
          </ActionPanel>
        );
      default: // idle, configuring
        return (
          <ActionPanel>
            <Action title="Close" icon={Icon.XMarkCircle} onAction={closeMainWindow} />
          </ActionPanel>
        );
    }
  }, [state, stopRecordingAndTranscribe, transcribedText, cleanupAudioFile, DEFAULT_ACTION]);

  if (state === "configuring") {
    // while checking config, show loading
    return <Detail isLoading={true} markdown={"Checking Whisper configuration..."} />;
  }

  if (state === "selectingPrompt") {
    return (
      <List navigationTitle="Select AI Refinement Prompt" searchBarPlaceholder="Search prompts...">
        {prompts.length === 0 ? (
          <List.EmptyView
            icon={{ source: Icon.Stars }}
            title="No Prompts Available"
            description="Configure AI refinement prompts first"
            actions={
              <ActionPanel>
                <Action
                  title="Configure AI"
                  icon={Icon.Gear}
                  onAction={async () => {
                    await launchCommand({ name: "configure-ai", type: LaunchType.UserInitiated });
                  }}
                />
                <Action
                  title="Skip & Use Active Prompt"
                  icon={Icon.Forward}
                  onAction={handleSkipAndUseActivePrompt}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action
                  title="Skip AI Refinement"
                  icon={Icon.XMarkCircle}
                  onAction={handleSkipAIRefinement}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                />
                <Action title="Skip & Continue" icon={Icon.ArrowRight} onAction={handlePromptSelectionCancel} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Section title={`Choose from ${prompts.length} available prompt${prompts.length > 1 ? "s" : ""}`}>
            {prompts.map((prompt) => (
              <List.Item
                key={prompt.id}
                icon={{ source: Icon.Stars }}
                title={prompt.name}
                subtitle={prompt.prompt.length > 80 ? `${prompt.prompt.substring(0, 80)}...` : prompt.prompt}
                accessories={[
                  ...(activePromptId === prompt.id ? [{ tag: { value: "Active", color: Color.Green } }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select Prompt"
                      icon={Icon.CheckCircle}
                      onAction={() => handlePromptSelection(prompt.id)}
                    />
                    <Action
                      title="Skip & Use Active Prompt"
                      icon={Icon.Forward}
                      onAction={handleSkipAndUseActivePrompt}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                    />
                    <Action
                      title="Skip AI Refinement"
                      icon={Icon.XMarkCircle}
                      onAction={handleSkipAIRefinement}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    />
                    <Action
                      title="Configure AI"
                      icon={Icon.Gear}
                      onAction={async () => {
                        await launchCommand({ name: "configure-ai", type: LaunchType.UserInitiated });
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Cancel"
                      icon={Icon.XMarkCircle}
                      onAction={handlePromptSelectionCancel}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  if (state === "recording") {
    let refinementSection = "";

    if (skipAIForSession) {
      refinementSection = `**AI Refinement: Skipped for this session**\n\n`;
    } else if (selectedSessionPrompt) {
      refinementSection = `**AI Refinement: ${selectedSessionPrompt.name}**\n\n`;
    } else if (isRefinementActive && currentRefinementPrompt) {
      const activePrompt = prompts.find((p) => p.prompt === currentRefinementPrompt);
      const promptName = activePrompt?.name || "Unknown Prompt";
      refinementSection = `**AI Refinement: ${promptName}**\n\n`;
    }

    const waveformWithRefinement = refinementSection + generateWaveformMarkdown();

    return <Detail markdown={waveformWithRefinement} actions={getActionPanel()} />;
  }

  //Dictation UI
  return (
    <Form
      isLoading={state === "transcribing"}
      actions={getActionPanel()}
      navigationTitle={
        state === "transcribing"
          ? "Transcribing..."
          : state === "done"
            ? "Transcription Result"
            : state === "error"
              ? "Error"
              : "Whisper Dictation"
      }
    >
      {state === "error" && <Form.Description title="Error" text={errorMessage} />}
      {(state === "done" || state === "transcribing" || state === "idle") && (
        <Form.TextArea
          id="dictatedText"
          title={state === "done" ? "Dictated Text" : ""} // Hide title unless done
          placeholder={
            state === "transcribing"
              ? "Transcribing audio..."
              : state === "done"
                ? "Transcription result"
                : "Waiting to start..." // idle state text
          }
          value={state === "done" ? transcribedText : ""} // Only show text when done
          onChange={setTranscribedText}
        />
      )}
      {state === "transcribing" && <Form.Description text="Processing audio, please wait..." />}
      {state === "done" && aiErrorMessage && <Form.Description title="AI Refinement Error" text={aiErrorMessage} />}
    </Form>
  );
}
