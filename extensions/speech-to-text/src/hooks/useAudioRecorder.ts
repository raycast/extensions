import { useState, useEffect, useRef } from "react";
import { ChildProcess, spawn } from "child_process";
import {
  generateAudioFilename,
  ensureTempDirectory,
  checkSoxInstalled,
  buildSoxCommand,
  validateAudioFile,
} from "../utils/audio";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ErrorTypes } from "../types";

interface AudioRecorderHook {
  isRecording: boolean;
  recordingDuration: number;
  recordingPath: string | null;
  error: string | null;
  startRecording: () => Promise<string | null>;
  stopRecording: () => Promise<string | null>;
}

export function useAudioRecorder(): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingProcess = useRef<ChildProcess | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalStop = useRef<boolean>(false);

  useEffect(() => {
    const checkSox = async () => {
      const soxPath = await checkSoxInstalled();
      if (!soxPath) {
        setError(ErrorTypes.SOX_NOT_INSTALLED);
      }
    };

    checkSox();

    return () => {
      if (isRecording) void stopRecording();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    };
  }, []);

  const startRecording = async (): Promise<string | null> => {
    setError(null);

    if (isRecording) {
      await showFailureToast(ErrorTypes.ALREADY_RECORDING, {
        title: "Already Recording",
      });
      return null;
    }

    const soxPath = await checkSoxInstalled();
    if (!soxPath) {
      setError(ErrorTypes.SOX_NOT_INSTALLED);
      return null;
    }

    try {
      const tempDir = await ensureTempDirectory();
      const outputPath = generateAudioFilename(tempDir);
      console.log("Recording to file:", outputPath);
      setRecordingPath(outputPath);

      console.log("Starting recording with Sox");
      recordingProcess.current = spawn(soxPath, buildSoxCommand(outputPath));

      recordingProcess.current.stdout?.on("data", (data) => {
        console.log(`Sox stdout: ${data}`);
      });

      recordingProcess.current.stderr?.on("data", (data) => {
        console.error(`Sox stderr: ${data}`);
      });

      recordingProcess.current?.on("error", (error) => {
        console.error(`Sox process error: ${error.message}`);
        setError(`${ErrorTypes.RECORDING_PROCESS_ERROR}: ${error.message}`);

        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }

        setIsRecording(false);
      });

      recordingProcess.current?.on("close", (code) => {
        console.log(`Sox process exited with code ${code}`);

        if (code !== 0 && isRecording && !isIntentionalStop.current) {
          setError(`Recording process exited unexpectedly with code ${code}`);

          if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
          }

          setIsRecording(false);
        }
        isIntentionalStop.current = false;
      });

      setRecordingDuration(0);
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      setIsRecording(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Recording started",
      });

      return outputPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error starting recording:", error);

      await showFailureToast(error, {
        title: "Failed to start recording",
      });

      setError(`${ErrorTypes.RECORDING_START_ERROR}: ${errorMessage}`);
      return null;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!isRecording || !recordingProcess.current) {
      return null;
    }

    const currentRecordingPath = recordingPath;
    console.log("Stopping recording, current path:", currentRecordingPath);

    try {
      isIntentionalStop.current = true;
      recordingProcess.current.kill();
      recordingProcess.current = null;

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      setIsRecording(false);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (currentRecordingPath) {
        const validationResult = await validateAudioFile(currentRecordingPath);

        if (!validationResult.isValid) {
          await showFailureToast(validationResult.error ?? ErrorTypes.INVALID_RECORDING, {
            title: "Invalid Recording",
          });
          setError(validationResult.error ?? ErrorTypes.INVALID_RECORDING);
          return null;
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Recording stopped",
          message: `Duration: ${recordingDuration} seconds`,
        });

        console.log("Returning recording path:", currentRecordingPath);
        return currentRecordingPath;
      } else {
        await showFailureToast(ErrorTypes.NO_RECORDING_FILE, {
          title: "Recording Failed",
        });
        setError(ErrorTypes.NO_RECORDING_FILE);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error stopping recording:", error);

      await showFailureToast(error, {
        title: "Failed to stop recording",
      });

      setError(`${ErrorTypes.RECORDING_STOP_ERROR}: ${errorMessage}`);
      setIsRecording(false);
      return null;
    }
  };

  return {
    isRecording,
    recordingDuration,
    recordingPath,
    error,
    startRecording,
    stopRecording,
  };
}
