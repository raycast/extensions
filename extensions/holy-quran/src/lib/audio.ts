import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const TEMP_FILE = path.join(os.tmpdir(), "quran_audio_temp.mp3");
const PLAYLIST_DIR = path.join(os.tmpdir(), "quran_audio_playlist");
const LOOP_SCRIPT = path.join(os.tmpdir(), "quran_audio_loop.sh");

export async function stopAudio(): Promise<void> {
  try {
    // Kill afplay and the background loop script
    // pkill -f matches the full command line, which will include our script path
    await execAsync(`pkill -9 afplay; pkill -f "${LOOP_SCRIPT}"`);
  } catch {
    // If no process is found, that's fine
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

export async function playVersePlaylist(urls: string[], repeatCount: number = 1): Promise<void> {
  await stopAudio();

  if (!fs.existsSync(PLAYLIST_DIR)) {
    fs.mkdirSync(PLAYLIST_DIR, { recursive: true });
  }

  // Clear previous playlist files
  const files = fs.readdirSync(PLAYLIST_DIR);
  for (const file of files) {
    try {
      fs.unlinkSync(path.join(PLAYLIST_DIR, file));
    } catch (e) {
      console.error(`Failed to delete old file: ${file}`, e);
    }
  }

  // Pre-download all verses for smooth transitions
  const localPaths: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const localPath = path.join(PLAYLIST_DIR, `v_${i}.mp3`);
    const resp = await fetch(urls[i]);
    if (!resp.ok) continue;
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(localPath, buf);
    localPaths.push(localPath);
  }

  if (localPaths.length === 0) throw new Error("Could not download any verses for playback.");

  // Build the loop script
  const playSequence = localPaths.map((p) => `afplay "${p}"`).join("; ");

  // If repeatCount is 0, we loop effectively indefinitely
  const iterations = repeatCount === 0 ? 9999 : repeatCount;

  const loopScript = `#!/bin/bash
for i in {1..${iterations}}; do
  ${playSequence}
done
`;

  fs.writeFileSync(LOOP_SCRIPT, loopScript, { mode: 0o755 });

  // Execute the script in the background
  exec(`"${LOOP_SCRIPT}"`);
}
