import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getAudioUrl } from "./storage";

function speakWithTts(word: string): void {
  execFile("say", [word]);
}

/**
 * Downloads and plays an audio file from Supabase Storage using macOS afplay.
 * Falls back to macOS TTS if no audio path is available.
 *
 * @param audioPath - Audio path from dictionary entry
 * @param word - The word to pronounce (used as TTS fallback)
 */
export async function pronounceWord(audioPath: string | null, word: string): Promise<void> {
  const audioUrl = getAudioUrl(audioPath);

  if (!audioUrl) {
    speakWithTts(word);
    return;
  }

  const response = await fetch(audioUrl);
  if (!response.ok) {
    speakWithTts(word);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const pronunciationFilePath = join(environment.supportPath, "pronunciation.mp3");
  await writeFile(pronunciationFilePath, buffer);
  execFile("afplay", [pronunciationFilePath]);
}
