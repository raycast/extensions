import { exec } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";

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

    // Download the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const tempPath = join(tmpdir(), `pronunciation-${Date.now()}.mp3`);

    // Write to temp file
    await writeFile(tempPath, Buffer.from(buffer));

    // Play with afplay (macOS)
    await new Promise<void>((resolve, reject) => {
      exec(`afplay "${tempPath}"`, (error) => {
        // Clean up temp file
        unlink(tempPath).catch(() => {});

        if (error) {
          reject(error);
        } else {
          resolve();
        }
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

// Get accent label from audio URL (Free Dictionary API uses regional subdomains)
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

// Text-to-Speech using macOS 'say' command for words not in dictionary
export async function speakWord(word: string, voice?: string): Promise<void> {
  if (!word) return;

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Speaking...",
    });

    const selectedVoice = voice || "Samantha"; // Default US English voice

    await new Promise<void>((resolve, reject) => {
      exec(
        `say -v "${selectedVoice}" "${word.replace(/"/g, '\\"')}"`,
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      );
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

// Available macOS voices for different accents
export const VOICES = {
  us: "Samantha", // US English
  uk: "Daniel", // UK English
  au: "Karen", // Australian English
  ie: "Moira", // Irish English
  za: "Tessa", // South African English
  in: "Veena", // Indian English
} as const;

export type VoiceAccent = keyof typeof VOICES;
