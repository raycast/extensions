import { spawn } from "child_process";
import { Response } from "openai/_shims/auto/types";
import { writeFile, unlink, mkdir } from "fs/promises";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { playAudio } from "openai/helpers/audio";
import { Preferences } from "./types";

function ensureFFmpegInPath(): string {
  const currentPath = process.env.PATH || "";
  const requiredPaths = ["/usr/local/bin", "/opt/homebrew/bin"];

  const pathEntries = currentPath.split(":");
  const missingPaths = requiredPaths.filter((path) => !pathEntries.includes(path));

  if (missingPaths.length === 0) {
    return currentPath;
  }

  return [...missingPaths, currentPath].join(":");
}

let ffplayAvailableCache: boolean | null = null;
const cleanupTimeouts = new Set<NodeJS.Timeout>();

async function isFFPlayAvailable(): Promise<boolean> {
  if (ffplayAvailableCache !== null) {
    return ffplayAvailableCache;
  }

  try {
    const result = await new Promise<boolean>((resolve) => {
      const child = spawn("ffplay", ["-version"], {
        stdio: "ignore",
        env: { ...process.env, PATH: ensureFFmpegInPath() },
      });
      child.on("close", (code) => {
        resolve(code === 0);
      });
      child.on("error", () => {
        resolve(false);
      });
    });

    ffplayAvailableCache = result;
    return result;
  } catch {
    ffplayAvailableCache = false;
    return false;
  }
}

export async function play(audio: Response, format: string): Promise<void> {
  if (!audio.body) {
    throw new Error("No audio stream");
  }

  const preferences = getPreferenceValues<Preferences>();
  const shouldSave = preferences.saveAudioFiles || false;

  const ffplayAvailable = await isFFPlayAvailable();
  console.log(`ffplay for streaming playback is: ${ffplayAvailable ? "available" : "not available"}`);

  if (ffplayAvailable) {
    try {
      // Temporarily set PATH for OpenAI's playAudio helper
      const originalPath = process.env.PATH;
      process.env.PATH = ensureFFmpegInPath();

      try {
        if (shouldSave) {
          const audioClone = audio.clone();
          const playPromise = playAudio(audio);
          const savePromise = saveAudioFile(audioClone, format);
          await Promise.all([playPromise, savePromise]);
        } else {
          await playAudio(audio);
        }
        return;
      } finally {
        process.env.PATH = originalPath;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`Streaming playback failed, falling back to file-based: ${errorMsg}`);
      // Continue to fallback - this is expected behavior, not a critical error
    }
  }

  await playWithFile(audio, format, shouldSave);
}

async function saveAudioFile(audio: Response, format: string): Promise<void> {
  const audioDir = join(homedir(), ".cache", "raycast-openai-voices");
  await mkdir(audioDir, { recursive: true });
  const filePath = join(audioDir, `openai-tts-${Date.now()}.${format}`);

  const buffer = Buffer.from(await audio.arrayBuffer());
  await writeFile(filePath, buffer);
}

async function playWithFile(audio: Response, format: string, shouldSave: boolean): Promise<void> {
  let tempFile: string;

  if (shouldSave) {
    const audioDir = join(homedir(), ".cache", "raycast-openai-voices");
    await mkdir(audioDir, { recursive: true });
    tempFile = join(audioDir, `openai-tts-${Date.now()}.${format}`);
  } else {
    tempFile = join(tmpdir(), `openai-tts-${Date.now()}.${format}`);
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    await writeFile(tempFile, buffer);

    await new Promise<void>((resolve, reject) => {
      const afplay = spawn("afplay", ["-v", "1.0", tempFile]);

      let errorOutput = "";

      afplay.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      afplay.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          const errorMessage = `afplay exited with code ${code}`;
          const detailedError = errorOutput ? `${errorMessage}: ${errorOutput}` : errorMessage;
          reject(new Error(detailedError));
        }
      });

      afplay.on("error", (err) => {
        reject(new Error(`afplay process error: ${err.message}`));
      });
    });
  } finally {
    if (!shouldSave) {
      const cleanup = async (attempts = 3) => {
        for (let i = 0; i < attempts; i++) {
          try {
            await unlink(tempFile);
            return;
          } catch {
            if (i < attempts - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
            }
          }
        }
      };
      const timeoutId = setTimeout(() => {
        cleanup().finally(() => cleanupTimeouts.delete(timeoutId));
      }, 1000);
      cleanupTimeouts.add(timeoutId);
    }
  }
}
