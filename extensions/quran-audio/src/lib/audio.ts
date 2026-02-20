import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const TEMP_FILE = path.join(os.tmpdir(), "quran_audio_temp.mp3");

export async function stopAudio(): Promise<void> {
  try {
    await execAsync("killall afplay");
  } catch {
    // If no afplay is running, that's fine
  }
}

export async function playAudio(url: string): Promise<void> {
  await stopAudio();

  // Download the file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(TEMP_FILE, buffer);

  // Play from the local file
  exec(`afplay "${TEMP_FILE}"`);
}
