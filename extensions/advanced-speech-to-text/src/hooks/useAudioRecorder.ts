import { useState, useEffect, useRef } from "react";
import { spawn, ChildProcess } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { join } from "path";
import {
  ensureTempDirectory,
  generateAudioFilename,
  checkSoxInstalled,
  buildSoxCommand,
  validateAudioFile,
} from "../utils/audio";
import { ErrorTypes } from "../types";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  recordingPath: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingProcessRef = useRef<ChildProcess | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (recordingProcessRef.current) {
        recordingProcessRef.current.kill("SIGINT");
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setIsRecording(false);
      setError(null);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);

      // Check if Sox is installed
      const soxPath = await checkSoxInstalled();
      if (!soxPath) {
        throw new Error(ErrorTypes.SOX_NOT_INSTALLED);
      }

      // Ensure temp directory exists
      const tempDir = await ensureTempDirectory();

      // Generate unique filename
      const filename = generateAudioFilename();
      const outputPath = join(tempDir, filename);

      // Build Sox command
      const commandArgs = buildSoxCommand(outputPath, soxPath);

      await showToast({
        style: Toast.Style.Success,
        title: "Recording started",
        message: "Speak into your microphone",
      });

      // Start recording using spawn for better security
      recordingProcessRef.current = spawn(commandArgs[0], commandArgs.slice(1));

      recordingProcessRef.current.stderr?.on("data", (data) => {
        console.log("Sox stderr:", data.toString());
      });

      recordingProcessRef.current.on("error", (error) => {
        console.error("Recording error:", error);
        setError(ErrorTypes.RECORDING_FAILED);
        setIsRecording(false);
      });

      setIsRecording(true);
      setRecordingPath(outputPath);
      startTimeRef.current = Date.now();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(Math.floor(elapsed));
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : ErrorTypes.RECORDING_FAILED;
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Recording failed",
        message: errorMessage,
      });
    }
  };

  const stopRecording = async () => {
    if (!recordingProcessRef.current || !isRecording) {
      return;
    }

    try {
      // Stop the recording process
      recordingProcessRef.current.kill("SIGINT");
      recordingProcessRef.current = null;

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setIsRecording(false);

      await showToast({
        style: Toast.Style.Success,
        title: "Recording stopped",
        message: "Processing audio...",
      });

      // Wait a moment for file to be written
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Validate the recorded file
      if (recordingPath) {
        const validation = await validateAudioFile(recordingPath);
        if (!validation.isValid) {
          throw new Error(validation.error || ErrorTypes.AUDIO_INVALID);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to stop recording";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Recording error",
        message: errorMessage,
      });
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
