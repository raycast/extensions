import { getSelectedFinderItems, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import { SUPPORTED_AUDIO_FORMATS } from "../types";

export interface AudioFileInfo {
  path: string;
  name: string;
}

/**
 * Audio file extensions supported by the application
 */
export const AUDIO_EXTENSIONS = SUPPORTED_AUDIO_FORMATS.map((format) => `.${format}`);

/**
 * Checks if FFmpeg is available and launches setup command if not
 * @returns Promise<boolean> - True if FFmpeg is available, false if not
 */
export async function checkFFmpegAndNotify(): Promise<boolean> {
  const { AudioProcessor } = await import("./audioProcessor");
  const ffmpegAvailable = await AudioProcessor.checkFFmpegAvailability();

  if (!ffmpegAvailable) {
    try {
      await launchCommand({
        name: "setup-ffmpeg",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      // Fallback to toast if launchCommand fails
      await showFailureToast(error, {
        title: "Failed to launch Setup FFmpeg",
      });
    }
  }

  return ffmpegAvailable;
}

/**
 * Loads the first selected audio file from Finder
 * @returns Promise<AudioFileInfo | null> - The selected audio file info or null if none found
 */
export async function loadSelectedAudioFile(): Promise<AudioFileInfo | null> {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length > 0) {
      const audioFile = selectedItems.find((item) =>
        AUDIO_EXTENSIONS.some((ext) => item.path.toLowerCase().endsWith(ext)),
      );
      if (audioFile) {
        return {
          path: audioFile.path,
          name: path.basename(audioFile.path),
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error loading selected file:", error);
    return null;
  }
}

/**
 * Loads all selected audio files from Finder
 * @returns Promise<string[]> - Array of audio file paths
 */
export async function loadSelectedAudioFiles(): Promise<string[]> {
  try {
    const selectedItems = await getSelectedFinderItems();
    return selectedItems
      .filter((item) => AUDIO_EXTENSIONS.some((ext) => item.path.toLowerCase().endsWith(ext)))
      .map((item) => item.path);
  } catch (error) {
    console.error("Error loading selected files:", error);
    return [];
  }
}

/**
 * Checks if a file path has an audio extension
 * @param filePath - The file path to check
 * @returns boolean - True if the file has an audio extension
 */
export function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
}
