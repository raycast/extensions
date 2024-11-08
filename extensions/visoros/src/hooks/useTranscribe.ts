// src/hooks/useTranscribe.ts
import { useState, useCallback } from "react";
import { showToast, Toast, getPreferenceValues, environment } from "@raycast/api";
import OpenAI from "openai";
import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const SOX_PATH = "/opt/homebrew/bin/sox";

interface PreferenceValues {
  openaiApiKey: string;
}

// Initialize OpenAI client
const prefs = getPreferenceValues<PreferenceValues>();
const openai = new OpenAI({
  apiKey: prefs.openaiApiKey,
  dangerouslyAllowBrowser: true,
});

async function checkSoxInstallation() {
  try {
    await fs.promises.access(SOX_PATH, fs.constants.X_OK);
    return true;
  } catch (error) {
    console.error("Sox access error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Sox is not accessible",
      message: `Cannot access sox at ${SOX_PATH}. Please check installation.`,
    });
    return false;
  }
}

export function useTranscribe() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingProcess, setRecordingProcess] = useState<ChildProcess | null>(null);

  // Ensure recording directory exists
  const recordingDir = path.join(environment.supportPath);
  const recordingPath = path.join(recordingDir, "recording.wav");

  const startRecording = useCallback(async () => {
    try {
      // Check for sox installation
      if (!(await checkSoxInstallation())) {
        return;
      }

      // Create recording directory if it doesn't exist
      await fs.promises.mkdir(recordingDir, { recursive: true });

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Recording...",
      });

      // Start recording with full path to sox
      console.log(`Starting recording with command: ${SOX_PATH} -d "${recordingPath}" rate 16k`);
      const childProcess = exec(`"${SOX_PATH}" -d "${recordingPath}" rate 16k`, {
        env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin` },
      });

      // Log any stderr output for debugging
      childProcess.stderr?.on("data", (data) => {
        console.error("Sox stderr:", data);
      });

      setRecordingProcess(childProcess);
      setIsRecording(true);
      toast.style = Toast.Style.Success;
      toast.title = "Recording Started";
    } catch (error) {
      console.error("Recording error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not start recording",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsRecording(false);
    }
  }, [recordingDir, recordingPath]);

  const stopRecording = useCallback(async () => {
    let toast;
    try {
      // Kill the recording process if it exists
      if (recordingProcess) {
        recordingProcess.kill("SIGTERM");
        setRecordingProcess(null);
      }

      // Try to kill any lingering sox processes
      try {
        await execAsync(`pkill -f "${SOX_PATH}"`);
      } catch (error) {
        // Ignore errors from pkill as they might just mean no process was found
        console.log("pkill error (can be ignored if no process found):", error);
      }

      setIsRecording(false);
      setIsTranscribing(true);

      // Check if the file exists and has content
      try {
        const stats = await fs.promises.stat(recordingPath);
        if (stats.size === 0) {
          throw new Error("Recording file is empty");
        }
      } catch (error) {
        console.error("Recording file error:", error);
        throw new Error("No valid recording found. Please try recording again.");
      }

      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Processing recording...",
      });

      // Read the recorded file
      const audioBuffer = await fs.promises.readFile(recordingPath);

      // Create a File object from the audio data
      const audioFile = new File([audioBuffer], "recording.wav", { type: "audio/wav" });

      // Send to OpenAI for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      // Clean up
      try {
        await fs.promises.unlink(recordingPath);
      } catch (error) {
        console.error("Error cleaning up recording file:", error);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Voice Note Ready";
      toast.message = "Transcription complete";

      return transcription.text;
    } catch (error) {
      console.error("Transcription error:", error);
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Transcription Failed";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Transcription Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return "";
    } finally {
      setIsTranscribing(false);
      setIsRecording(false);
    }
  }, [recordingProcess, recordingPath]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
