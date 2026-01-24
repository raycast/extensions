/**
 * Audio playback utilities for pronunciation and text-to-speech.
 * Uses macOS native commands: `afplay` for audio files, `say` for TTS.
 * @module utils/audio
 */

import { exec } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";
import { VOICES } from "../constants";

// Re-export for convenience.
export { VOICES };

/**
 * Downloads and plays an audio file from a URL.
 *
 * Process:
 * 1. Download audio to temp file
 * 2. Play using macOS `afplay` command
 * 3. Clean up temp file after playback
 *
 * @param audioUrl - URL to the audio file (MP3)
 */
export async function playAudio(audioUrl: string): Promise<void> {
  if (!audioUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No audio available",
      message: "This pronunciation doesn't have an audio file",
    });
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Loading audio...",
    });

    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const tempPath = join(tmpdir(), `pronunciation-${Date.now()}.mp3`);

    await writeFile(tempPath, Buffer.from(buffer));

    await new Promise<void>((resolve, reject) => {
      exec(`afplay "${tempPath}"`, (error) => {
        unlink(tempPath).catch(() => {});
        error ? reject(error) : resolve();
      });
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Audio played",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to play audio",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Detects accent/region from audio URL patterns.
 * Free Dictionary API uses regional markers in URLs (e.g., "-us.mp3", "/uk/").
 *
 * @param audioUrl - URL to analyze
 * @returns Emoji + region code (e.g., "🇺🇸 US")
 */
export function getAccentFromUrl(audioUrl?: string): string {
  if (!audioUrl) return "Unknown";

  if (audioUrl.includes("-us.mp3") || audioUrl.includes("/us/")) {
    return "🇺🇸 US";
  }
  if (audioUrl.includes("-uk.mp3") || audioUrl.includes("/uk/")) {
    return "🇬🇧 UK";
  }
  if (audioUrl.includes("-au.mp3") || audioUrl.includes("/au/")) {
    return "🇦🇺 AU";
  }

  return "🔊 Audio";
}

/**
 * Speaks a word using macOS Text-to-Speech.
 * Useful for technical terms not in the dictionary (e.g., "Kubernetes").
 *
 * @param word - Word to speak
 * @param voice - macOS voice name (defaults to "Samantha" for US English)
 */
export async function speakWord(word: string, voice?: string): Promise<void> {
  if (!word) return;

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Speaking...",
    });

    const selectedVoice = voice || VOICES.us;
    const sanitizedWord = sanitizeForShell(word);

    await new Promise<void>((resolve, reject) => {
      exec(`say -v "${selectedVoice}" "${sanitizedWord}"`, (error) => {
        error ? reject(error) : resolve();
      });
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Spoken",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to speak",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Sanitizes input for safe shell command execution.
 * Removes characters that could be used for command injection.
 */
function sanitizeForShell(input: string): string {
  return input.replace(/[`$\\;"'|&<>(){}[\]!#*?~]/g, "");
}
