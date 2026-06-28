import { mkdir, unlink, writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import { ensureToolingInPath } from "./path-utils";
import { startPlayback } from "./playback-controller";
import { parseSpeed } from "./playback-mode";
import { Preferences } from "./types";

const cleanupTimeouts = new Set<NodeJS.Timeout>();
let ffmpegAvailableCache: boolean | null = null;

export type PlayResult = {
  warnings: string[];
  completion: "finished" | "stopped";
};

export async function play(audio: Buffer, sourceFormat: string): Promise<PlayResult> {
  const warnings: string[] = [];
  const preferences = getPreferenceValues<Preferences>();
  const shouldSave = preferences.saveAudioFiles || false;
  let outputFormat: string = preferences.outputFormat || sourceFormat;
  let speed = parseSpeed(preferences.speed);
  let needsTranscode = outputFormat !== sourceFormat || speed !== 1;

  const audioDir = join(homedir(), ".cache", "raycast-tts");
  if (shouldSave) {
    await mkdir(audioDir, { recursive: true });
  }

  const inputIsTemporary = !shouldSave || needsTranscode;
  const inputPath = createAudioPath({
    audioDir,
    extension: sourceFormat,
    useTemporaryDirectory: inputIsTemporary,
  });

  await writeFile(inputPath, audio);

  let playPath = inputPath;

  if (needsTranscode) {
    if (!(await isFfmpegAvailable())) {
      outputFormat = sourceFormat;
      speed = 1;
      needsTranscode = false;
      warnings.push("ffmpeg not found — playing at original speed and format");
    }
  }

  if (needsTranscode) {
    const outputPath = createAudioPath({
      audioDir,
      extension: outputFormat,
      useTemporaryDirectory: !shouldSave,
    });

    await transcodeAudio(inputPath, outputPath, speed);

    if (inputIsTemporary && inputPath !== outputPath) {
      await unlink(inputPath).catch(() => undefined);
    }

    playPath = outputPath;
  }

  try {
    const completion = await startPlayback(playPath);
    return { warnings, completion };
  } finally {
    if (!shouldSave) {
      scheduleCleanup(playPath);
    }
  }
}

function createAudioPath({
  audioDir,
  extension,
  useTemporaryDirectory,
}: {
  audioDir: string;
  extension: string;
  useTemporaryDirectory: boolean;
}): string {
  const directory = useTemporaryDirectory ? tmpdir() : audioDir;
  return join(directory, `tts-${Date.now()}.${extension}`);
}

async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailableCache !== null) {
    return ffmpegAvailableCache;
  }

  try {
    const result = await new Promise<boolean>((resolve) => {
      const child = spawn("ffmpeg", ["-version"], {
        stdio: "ignore",
        env: { ...process.env, PATH: ensureToolingInPath() },
      });
      child.on("close", (code) => resolve(code === 0));
      child.on("error", () => resolve(false));
    });
    ffmpegAvailableCache = result;
    return result;
  } catch {
    ffmpegAvailableCache = false;
    return false;
  }
}

async function transcodeAudio(inputPath: string, outputPath: string, speed: number): Promise<void> {
  const args = ["-y", "-i", inputPath];
  const speedFilter = buildAtempoFilter(speed);

  if (speedFilter) {
    args.push("-filter:a", speedFilter);
  }

  args.push(outputPath);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, PATH: ensureToolingInPath() },
    });

    let errorOutput = "";
    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`ffmpeg process error: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const details = errorOutput.trim();
        reject(new Error(`ffmpeg exited with code ${code}${details ? `: ${details}` : ""}`));
      }
    });
  });
}

function buildAtempoFilter(speed: number): string | null {
  if (speed === 1) {
    return null;
  }

  const filters: number[] = [];
  let remaining = speed;

  while (remaining > 2.0) {
    filters.push(2.0);
    remaining /= 2.0;
  }

  while (remaining < 0.5) {
    filters.push(0.5);
    remaining /= 0.5;
  }

  if (Math.abs(remaining - 1) > 0.001) {
    filters.push(remaining);
  }

  return filters.length > 0 ? filters.map((value) => `atempo=${value.toFixed(3)}`).join(",") : null;
}

function scheduleCleanup(filePath: string): void {
  const cleanup = async (attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try {
        await unlink(filePath);
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
