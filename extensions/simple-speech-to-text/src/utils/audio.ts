import { spawn } from "child_process";
import {
  readdir,
  stat,
  access,
  mkdir,
  unlink,
  writeFile,
  readFile,
} from "fs/promises";
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
import {
  ErrorTypes,
  AudioValidationResult,
  TranscriptionFile,
  TranscriptionData,
} from "../types";

export async function ensureTempDirectory(): Promise<string> {
  try {
    await access(TEMP_DIRECTORY);
    return TEMP_DIRECTORY;
  } catch (error) {
    try {
      await mkdir(TEMP_DIRECTORY, { recursive: true });
      return TEMP_DIRECTORY;
    } catch (mkdirError) {
      console.error("Cannot create temp directory:", mkdirError);
      throw new Error(`Could not create temp directory: ${TEMP_DIRECTORY}`);
    }
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
      const MAX_BUFFER_SIZE = 5 * 1024 * 1024; // 5MB limit

      await new Promise<void>((resolve, reject) => {
        sox.stdout.on("data", (data) => {
          if (output.length + data.length > MAX_BUFFER_SIZE) {
            sox.kill();
            reject(new Error("Sox output exceeded maximum buffer size"));
            return;
          }
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

export async function saveTranscription(
  audioFilePath: string,
  transcriptionData: TranscriptionData,
): Promise<void> {
  try {
    // Replace audio extension with .json
    const jsonPath = audioFilePath.replace(`.${RECORDING_FORMAT}`, ".json");
    await writeFile(
      jsonPath,
      JSON.stringify(transcriptionData, null, 2),
      "utf-8",
    );
  } catch (error) {
    console.error(`Failed to save transcription for ${audioFilePath}:`, error);
    throw error;
  }
}

export async function loadTranscription(
  audioFilePath: string,
): Promise<TranscriptionData | null> {
  try {
    const jsonPath = audioFilePath.replace(`.${RECORDING_FORMAT}`, ".json");
    await access(jsonPath); // Check if file exists
    const data = await readFile(jsonPath, "utf-8");
    return JSON.parse(data) as TranscriptionData;
  } catch (error) {
    // File doesn't exist or couldn't be read - this is normal for untranscribed audio
    return null;
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

        // Try to load associated transcription
        const transcriptionData = await loadTranscription(filePath);

        transcriptionFiles.push({
          id: `${stats.birthtime.getTime()}_${file}`,
          filePath,
          fileName: file,
          recordedAt: stats.birthtime,
          duration,
          sizeInBytes: stats.size,
          wordCount: transcriptionData?.wordCount || 0,
          transcription: transcriptionData?.transcription || null,
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

export async function cleanupTempFiles(
  maxAgeHours: number = 24,
): Promise<void> {
  try {
    const files = await listAudioFiles(TEMP_DIRECTORY);
    const now = new Date();

    for (const file of files) {
      const fileAge = now.getTime() - file.recordedAt.getTime();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      if (fileAge > maxAgeMs) {
        try {
          // Delete audio file
          await unlink(file.filePath);

          // Also delete associated transcription JSON if it exists
          const jsonPath = file.filePath.replace(
            `.${RECORDING_FORMAT}`,
            ".json",
          );
          try {
            await unlink(jsonPath);
          } catch {
            // JSON file might not exist, that's okay
          }
        } catch (error) {
          console.warn(`Failed to delete old file ${file.filePath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Failed to cleanup temp files:", error);
  }
}

export async function deleteRecordingFile(
  audioFilePath: string,
): Promise<void> {
  try {
    // Delete audio file
    await unlink(audioFilePath);

    // Also delete associated transcription JSON if it exists
    const jsonPath = audioFilePath.replace(`.${RECORDING_FORMAT}`, ".json");
    try {
      await unlink(jsonPath);
    } catch {
      // JSON file might not exist, that's okay
    }
  } catch (error) {
    throw new Error(
      `Failed to delete recording: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
