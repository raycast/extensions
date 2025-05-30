import { spawn } from "child_process";
import { readdir, stat, access } from "fs/promises";
import { join } from "path";
import {
  TEMP_DIRECTORY,
  RECORDING_FORMAT,
  RECORDING_SAMPLE_RATE,
  RECORDING_CHANNELS,
  RECORDING_BITS,
  SOX_PATHS,
  MIN_AUDIO_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
} from "../constants";
import { ErrorTypes, AudioValidationResult, TranscriptionFile } from "../types";

export async function ensureTempDirectory(): Promise<string> {
  try {
    await access(TEMP_DIRECTORY);
    return TEMP_DIRECTORY;
  } catch (error) {
    console.error("Cannot access temp directory:", error);
    throw new Error(`Could not access temp directory: ${TEMP_DIRECTORY}`);
  }
}

export function generateAudioFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `recording-${timestamp}.${RECORDING_FORMAT}`;
}

function isValidExecutablePath(path: string): boolean {
  // Only allow absolute paths or simple binary names without path traversal
  if (path.includes("..") || path.includes("~")) {
    return false;
  }

  // Allow absolute paths starting with / or simple binary names
  return path.startsWith("/") || !path.includes("/");
}

export async function checkSoxInstalled(): Promise<string | null> {
  for (const soxPath of SOX_PATHS) {
    // Validate the path before attempting to execute
    if (!isValidExecutablePath(soxPath)) {
      console.warn(`Skipping invalid sox path: ${soxPath}`);
      continue;
    }

    try {
      const sox = spawn(soxPath, ["--version"]);
      await new Promise<void>((resolve, reject) => {
        sox.on("close", (code) => {
          if (code === 0) resolve();
          else reject();
        });
        sox.on("error", reject);
      });
      return soxPath;
    } catch {
      continue;
    }
  }
  return null;
}

export function buildSoxCommand(outputPath: string, soxPath: string): string[] {
  // Validate the sox path before building the command
  if (!isValidExecutablePath(soxPath)) {
    throw new Error(`Invalid sox executable path: ${soxPath}`);
  }

  return [
    soxPath,
    "-d",
    "-t",
    RECORDING_FORMAT,
    "-r",
    RECORDING_SAMPLE_RATE.toString(),
    "-c",
    RECORDING_CHANNELS.toString(),
    "-b",
    RECORDING_BITS.toString(),
    outputPath,
  ];
}

export async function validateAudioFile(
  filePath: string,
): Promise<AudioValidationResult> {
  try {
    await access(filePath);
  } catch {
    return { isValid: false, error: ErrorTypes.AUDIO_NOT_FOUND };
  }

  try {
    const stats = await stat(filePath);
    if (stats.size < MIN_AUDIO_SIZE_BYTES) {
      return { isValid: false, error: ErrorTypes.AUDIO_TOO_SHORT };
    }
    if (stats.size > MAX_AUDIO_SIZE_BYTES) {
      return { isValid: false, error: ErrorTypes.AUDIO_TOO_LARGE };
    }
  } catch {
    return { isValid: false, error: ErrorTypes.AUDIO_INVALID };
  }

  const soxPath = await checkSoxInstalled();
  if (soxPath) {
    try {
      const sox = spawn(soxPath, [filePath, "-n", "stat"]);
      await new Promise<void>((resolve, reject) => {
        sox.on("close", (code) => {
          if (code === 0) resolve();
          else reject();
        });
        sox.on("error", reject);
      });
    } catch {
      return { isValid: false, error: ErrorTypes.AUDIO_INVALID };
    }
  }

  return { isValid: true };
}

export async function getAudioDuration(filePath: string): Promise<number> {
  const soxPath = await checkSoxInstalled();

  if (soxPath) {
    try {
      const sox = spawn(soxPath, [filePath, "-n", "stat"]);
      let output = "";

      await new Promise<void>((resolve, reject) => {
        sox.stdout.on("data", (data) => {
          output += data.toString();
        });

        sox.on("close", (code) => {
          if (code === 0) resolve();
          else reject();
        });
        sox.on("error", reject);
      });

      const match = output.match(/Length \(seconds\):\s+([0-9.]+)/);
      if (match) {
        return parseFloat(match[1]);
      }
    } catch {
      // Fall back to file size estimation
    }
  }

  // Fallback: estimate duration from file size
  try {
    const stats = await stat(filePath);
    const bytesPerSecond =
      (RECORDING_SAMPLE_RATE * RECORDING_CHANNELS * RECORDING_BITS) / 8;
    return stats.size / bytesPerSecond;
  } catch (error) {
    console.warn(`Failed to get duration for ${filePath}:`, error);
    return 0;
  }
}

export async function listAudioFiles(
  directory: string,
): Promise<TranscriptionFile[]> {
  try {
    const files = await readdir(directory);
    const audioFiles = files.filter((file) =>
      file.endsWith(`.${RECORDING_FORMAT}`),
    );

    const transcriptionFiles: TranscriptionFile[] = [];

    for (const file of audioFiles) {
      try {
        const filePath = join(directory, file);
        const stats = await stat(filePath);
        const duration = await getAudioDuration(filePath);

        transcriptionFiles.push({
          id: `${stats.birthtime.getTime()}_${file}`,
          filePath,
          fileName: file,
          recordedAt: stats.birthtime,
          duration,
          sizeInBytes: stats.size,
          wordCount: 0,
          transcription: null,
        });
      } catch (error) {
        console.warn(`Failed to process audio file ${file}:`, error);
        continue;
      }
    }

    return transcriptionFiles.sort(
      (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
    );
  } catch (error) {
    console.error("Failed to list audio files:", error);
    return [];
  }
}
