import { useCallback, type Dispatch, type SetStateAction } from "react";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { showFailureToast } from "@raycast/utils";
import {
  showToast,
  Toast,
  openExtensionPreferences,
  Clipboard,
  closeMainWindow,
  PopToRootType,
  showHUD,
  environment,
} from "@raycast/api";

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

const AUDIO_FILE_PATH = path.join(environment.supportPath, "raycast_dictate_audio.wav");
const WAV_HEADER_SIZE = 44;

interface UseTranscriptionProps {
  config: Config | null;
  preferences: Preferences;
  setState: Dispatch<SetStateAction<CommandState>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setTranscribedText: Dispatch<SetStateAction<string>>;
  refineText: (text: string) => Promise<string>;
  saveTranscriptionToHistory: (text: string) => Promise<void>;
  cleanupAudioFile: () => void;
  aiErrorMessage: string;
  skipAIForSession: boolean;
}
/**
 * Hook that manages audio transcription using Whisper CLI.
 * @param config - Configuration containing paths to required executables and model
 * @param preferences - User preferences for transcription and post-processing
 * @param setState - Function to update the current command state
 * @param setErrorMessage - Function to set error message when transcription fails
 * @param setTranscribedText - Function to update the transcribed text result
 * @param refineText - Function to apply AI refinement to the transcribed text
 * @param saveTranscriptionToHistory - Function to save completed transcription to history
 * @param cleanupAudioFile - Function to remove the temporary audio file
 * @param aiErrorMessage - Error message from AI refinement if it failed
 * @returns Object containing the startTranscription function
 */
export function useTranscription({
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
}: UseTranscriptionProps) {
  const handlePasteAndCopy = useCallback(
    async (text: string) => {
      try {
        await Clipboard.copy(text);
        await Clipboard.paste(text);
        await showHUD("Copied and pasted transcribed text");
      } catch (error) {
        console.error("Error during copy and paste:", error);
        showFailureToast(error, { title: "Failed to copy and paste text" });
      }
      await Promise.all([
        cleanupAudioFile(),
        closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate }),
      ]);
    },
    [cleanupAudioFile],
  );

  const handleTranscriptionResult = useCallback(
    async (rawText: string) => {
      let finalText = rawText;

      // Apply AI refinement if enabled and text is not empty and not skipped for session
      if (
        preferences.aiRefinementMethod !== "disabled" &&
        !skipAIForSession &&
        rawText &&
        rawText !== "[BLANK_AUDIO]"
      ) {
        try {
          finalText = await refineText(rawText);
        } catch (error) {
          console.error("AI refinement error during transcription handling:", error);
          // Error is already set by refineText, just use original text
          finalText = rawText;
        }
      } else {
        console.log("AI refinement skipped.");
      }

      setTranscribedText(finalText);
      await saveTranscriptionToHistory(finalText);
      setState("done");

      const DEFAULT_ACTION = preferences.defaultAction || "none";

      const handleClipboardActionAndClose = async (action: "paste" | "copy", text: string) => {
        if (action === "paste") {
          await Clipboard.paste(text);
          await showHUD("Pasted transcribed text");
        } else {
          await Clipboard.copy(text);
          await showHUD("Copied to clipboard");
        }
        await Promise.all([
          cleanupAudioFile(),
          closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate }),
        ]);
      };

      if (DEFAULT_ACTION === "paste") {
        await handleClipboardActionAndClose("paste", finalText);
      } else if (DEFAULT_ACTION === "copy") {
        await handleClipboardActionAndClose("copy", finalText);
      } else if (DEFAULT_ACTION === "copy_paste") {
        await handlePasteAndCopy(finalText);
      } else {
        // Action is "none", stay in "done" state
        // Show success toast only if AI didn't fail (or wasn't used)
        if (preferences.aiRefinementMethod === "disabled" || skipAIForSession || !aiErrorMessage) {
          await showToast({ style: Toast.Style.Success, title: "Transcription complete" });
        }
        // Clean up file when staying in 'done' state
        cleanupAudioFile();
      }
    },
    [
      preferences,
      refineText,
      saveTranscriptionToHistory,
      setTranscribedText,
      setState,
      cleanupAudioFile,
      aiErrorMessage,
      handlePasteAndCopy,
      skipAIForSession,
    ],
  );

  const startTranscription = useCallback(async () => {
    if (!config) {
      console.error("startTranscription: Configuration not available.");
      setErrorMessage("Configuration error occurred before transcription.");
      setState("error");
      return;
    }

    setState("transcribing");
    showToast({ style: Toast.Style.Animated, title: "Transcribing..." });
    console.log("Set state to transcribing.");

    // Delay to ensure audio file is fully written
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(`Checking for audio file: ${AUDIO_FILE_PATH}`);
    try {
      const stats = await fs.promises.stat(AUDIO_FILE_PATH);
      console.log(`Audio file stats: ${JSON.stringify(stats)}`);
      if (stats.size <= WAV_HEADER_SIZE) {
        // WAV header size
        throw new Error(
          `Audio file is empty or too small (size: ${stats.size} bytes). Recording might have failed or captured no sound.`,
        );
      }
      console.log(`Audio file exists and has size ${stats.size}. Proceeding with transcription.`);
    } catch (error: unknown) {
      console.error(`Audio file check failed: ${AUDIO_FILE_PATH}`, error);
      const err = error as NodeJS.ErrnoException;
      const errorMsg =
        err.code === "ENOENT"
          ? `Transcription failed: Audio file not found. Recording might have failed.`
          : `Transcription failed: Cannot access audio file. ${err.message}`;
      setErrorMessage(errorMsg);
      setState("error");
      cleanupAudioFile(); // Clean up if file check fails
      return;
    }

    console.log(`Starting transcription with model: ${config.modelPath}`);

    // Execute whisper-cli
    execFile(
      config.execPath,
      ["-m", config.modelPath, "-f", AUDIO_FILE_PATH, "-l", "auto", "-otxt", "--no-timestamps"],
      async (error, stdout, stderr) => {
        if (error) {
          console.error("whisper exec error:", error);
          console.error("whisper stderr:", stderr);

          let title = "Transcription Failed";
          let errMsg = `An unknown error occurred during transcription.`;

          const stderrStr = stderr?.toString() || "";
          const errorMsgStr = error?.message || "";

          if (stderrStr.includes("invalid model") || stderrStr.includes("failed to load model")) {
            title = "Model Error";
            errMsg = `The model file at '${config.modelPath}' is invalid, incompatible, or failed to load. Please check the model file, if it's compatible with whisper.cpp (ggml) or select a different one in preferences.`;
          } else if (stderrStr.includes("No such file or directory") || errorMsgStr.includes("ENOENT")) {
            if (errorMsgStr.includes(config.execPath)) {
              title = "Whisper Executable Not Found";
              errMsg = `The whisper executable was not found at '${config.execPath}'. Please verify the path in preferences.`;
            } else if (stderrStr.includes(config.modelPath) || errorMsgStr.includes(config.modelPath)) {
              title = "Model File Not Found";
              errMsg = `The model file specified at '${config.modelPath}' was not found. Please check the path in preferences or download the model using the Download whisper model command.`;
            } else {
              title = "File Not Found";
              errMsg = `A required file or directory was not found. Double check your whisper-cli and model path. ${stderrStr}`;
            }
          } else if (stderrStr) {
            errMsg = `Transcription failed. Details: ${stderrStr}`;
          } else {
            errMsg = `Transcription failed: ${error.message}`;
          }

          setErrorMessage(errMsg);
          setState("error");
          cleanupAudioFile(); // Clean up on exec error

          await showFailureToast(errMsg, {
            title: title,
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: () => openExtensionPreferences(),
            },
          });
        } else {
          console.log("Transcription successful.");
          const trimmedText = stdout.trim() || "[BLANK_AUDIO]";
          console.log("Transcribed text:", trimmedText);
          // Pass text to handler to set state/save history/refine/etc.
          await handleTranscriptionResult(trimmedText);
        }
      },
    );
  }, [config, setState, setErrorMessage, handleTranscriptionResult, cleanupAudioFile]);

  return { startTranscription, handlePasteAndCopy };
}
