import { useEffect, useRef, type MutableRefObject, type Dispatch, type SetStateAction, useCallback } from "react";
import { showToast, Toast, getPreferenceValues, environment } from "@raycast/api";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";
import { useCachedState, showFailureToast } from "@raycast/utils";

const AUDIO_FILE_PATH = path.join(environment.supportPath, "raycast_dictate_audio.wav");
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
  | "idle"
  | "recording"
  | "transcribing"
  | "done"
  | "error"
  | "selectingPrompt";

interface Config {
  execPath: string;
  modelPath: string;
  soxPath: string;
}

interface UseRecordingResult {
  restartRecording: () => void;
  currentRefinementPrompt: string | null;
  isRefinementActive: boolean;
}

/**
 * Hook to manage audio recording for transcription with SoX.
 * @param config - Configuration object with paths to required executables and models
 * @param setState - Function to update the command state
 * @param setErrorMessage - Function to set error message when errors occur
 * @param soxProcessRef - Mutable ref to track the SoX child process
 */
export function useRecording(
  state: CommandState,
  config: Config | null,
  setState: Dispatch<SetStateAction<CommandState>>,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  soxProcessRef: MutableRefObject<ChildProcessWithoutNullStreams | null>,
): UseRecordingResult {
  const hasStartedRef = useRef(false);
  const stateRef = useRef<CommandState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const preferences = getPreferenceValues<Preferences>();
  const [prompts] = useCachedState<AIPrompt[]>(AI_PROMPTS_KEY, []);
  const [activePromptId] = useCachedState<string>(ACTIVE_PROMPT_ID_KEY, "");

  const isRefinementActive = preferences.aiRefinementMethod !== "disabled";

  const currentRefinementPrompt =
    isRefinementActive && activePromptId ? prompts.find((p) => p.id === activePromptId)?.prompt || null : null;

  const restartRecording = useCallback(() => {
    console.log("useRecording: restartRecording called.");
    const currentProcess = soxProcessRef.current;
    if (currentProcess && !currentProcess.killed) {
      console.log(`useRecording: Killing existing process PID: ${currentProcess.pid} for restart.`);
      try {
        process.kill(currentProcess.pid!, "SIGKILL");
        console.log(`useRecording: Sent SIGKILL to PID ${currentProcess.pid}`);
      } catch (e) {
        if (e instanceof Error && "code" in e && e.code !== "ESRCH") {
          console.warn(`useRecording: Error sending SIGKILL during restart:`, e);
        } else {
          console.log(`useRecording: Process ${currentProcess.pid} likely already exited during restart.`);
        }
      }
      soxProcessRef.current = null;
    } else {
      console.log("useRecording: No active process found to kill for restart.");
    }

    hasStartedRef.current = false;
    setErrorMessage("");
    setState("idle");
    console.log("useRecording: Set state to idle to trigger restart.");
  }, [setState, setErrorMessage, soxProcessRef]);

  useEffect(() => {
    if (state !== "idle" || !config || hasStartedRef.current || soxProcessRef.current) {
      console.log(
        `useRecording effect skipped: state=${state}, config=${!!config}, hasStarted=${hasStartedRef.current}, processExists=${!!soxProcessRef.current}`,
      );
      return;
    }

    let isMounted = true;
    const startRecording = async () => {
      const audioDir = path.dirname(AUDIO_FILE_PATH);
      try {
        await fs.promises.mkdir(audioDir, { recursive: true });
        if (!isMounted) return;

        console.log("useRecording: Configuration ready, attempting to start recording.");
        setState("recording");
        showToast({ style: Toast.Style.Animated, title: "Recording...", message: "Press Enter to stop" });

        const args = [
          "-d",
          "-t",
          "wav",
          "--channels",
          "1",
          "--rate",
          "16000",
          "--encoding",
          "signed-integer",
          "--bits",
          "16",
          AUDIO_FILE_PATH,
        ];

        const process = spawn(config.soxPath, args);
        soxProcessRef.current = process;
        hasStartedRef.current = true;

        console.log(`useRecording: Spawned sox process with PID: ${process.pid}`);

        process.on("error", (err) => {
          console.error(`useRecording: sox process PID ${process.pid} error event:`, err);
          if (soxProcessRef.current === process) {
            soxProcessRef.current = null;
          }
          if (isMounted) {
            setErrorMessage(`Recording failed: ${err.message}`);
            setState("error");
            showFailureToast(err, { title: "Recording failed" });
          }
        });

        process.stderr.on("data", (data) => {
          console.log(`useRecording: sox stderr PID ${process.pid}: ${data.toString()}`);
        });

        process.on("close", (code, signal) => {
          console.log(`useRecording: sox process PID ${process.pid} closed. Code: ${code}, Signal: ${signal}`);
          if (soxProcessRef.current === process) {
            soxProcessRef.current = null;
            console.log("useRecording: Cleared sox process ref due to close event.");
            if (isMounted && stateRef.current === "recording" && signal !== "SIGTERM" && code !== 0) {
              console.warn(`useRecording: SoX process closed unexpectedly (code: ${code}, signal: ${signal}).`);
              const errorMessage = `Recording process stopped unexpectedly.`;
              setErrorMessage(errorMessage);
              setState("error");
              showFailureToast(errorMessage, { title: "Recording Error" });
            }
          }
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("useRecording: Error during recording setup/spawn:", error);
        if (isMounted) {
          setErrorMessage(`Failed to start recording: ${error.message}`);
          setState("error");
        }
      }
    };

    startRecording();

    return () => {
      isMounted = false;
    };
  }, [config, state, setState, setErrorMessage, soxProcessRef]);

  useEffect(() => {
    return () => {
      console.log(`useRecording cleanup on unmount: PID: ${soxProcessRef.current?.pid}`);

      if (soxProcessRef.current && !soxProcessRef.current.killed) {
        console.log(
          `useRecording cleanup: Component unmounting while process ${soxProcessRef.current.pid} is active. Killing process.`,
        );
        try {
          process.kill(soxProcessRef.current.pid!, "SIGKILL");
          console.log(`useRecording cleanup: Sent SIGKILL to PID ${soxProcessRef.current.pid}`);
          soxProcessRef.current = null;
        } catch (e) {
          if (e instanceof Error && "code" in e && e.code !== "ESRCH") {
            console.warn(`useRecording cleanup: Error sending SIGKILL:`, e);
          }
        }
      }
    };
  }, [soxProcessRef]);

  return {
    restartRecording,
    currentRefinementPrompt,
    isRefinementActive,
  };
}
