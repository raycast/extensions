import {
  showToast,
  Toast,
  getPreferenceValues,
  showHUD,
  open,
  Clipboard,
  confirmAlert,
  Alert,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { homedir } from "os";
import { stat } from "fs/promises";
import { resolveVideoFile, isSupportedVideo, getUnsupportedExtension } from "./lib/file-resolver";
import { getVideoMetadata, formatFileSize, formatDuration, getOutputPath } from "./lib/video-utils";
import { convertToGif } from "./lib/ffmpeg";
import { addHistoryEntry } from "./lib/history";
import { Preferences, ConversionSettings, SUPPORTED_EXTENSIONS } from "./types";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  // 1. Resolve the video file
  const filePath = await resolveVideoFile();

  if (!filePath) {
    // Fall back to custom convert command with file picker
    try {
      await launchCommand({ name: "convert-to-gif-custom", type: LaunchType.UserInitiated });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Video Selected",
        message: "Select a video in Finder or copy a file path to clipboard",
      });
    }
    return;
  }

  // 2. Validate the file
  if (!isSupportedVideo(filePath)) {
    const ext = getUnsupportedExtension(filePath);
    await showToast({
      style: Toast.Style.Failure,
      title: "Unsupported File Type",
      message: `"${ext}" is not supported. Use: ${SUPPORTED_EXTENSIONS.join(", ")}`,
    });
    return;
  }

  // 3. Get video metadata
  let metadata;
  try {
    metadata = await getVideoMetadata(filePath);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Read Video",
      message: error instanceof Error ? error.message : "Could not read video metadata",
    });
    return;
  }

  // 4. Check long video threshold
  const threshold = parseInt(prefs.longVideoThreshold || "30", 10);
  if (metadata.duration > threshold) {
    const confirmed = await confirmAlert({
      title: "Long Video",
      message: `This video is ${formatDuration(metadata.duration)} long. The GIF will be very large. Convert anyway?`,
      primaryAction: {
        title: "Convert Anyway",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;
  }

  // 5. Build settings from preferences
  const settings: ConversionSettings = {
    inputPath: filePath,
    quality: Math.max(1, Math.min(100, parseInt(prefs.defaultQuality || "80", 10) || 80)),
    maxWidth: prefs.defaultMaxWidth || "640",
    fps: Math.max(1, Math.min(50, parseInt(prefs.defaultFps || "15", 10) || 15)),
    speed: 1,
    loopMode: prefs.defaultLoopMode || "loop",
  };

  // 6. Determine output path
  const outputFolder = prefs.outputFolder || `${homedir()}/Desktop`;
  const outputPath = getOutputPath(filePath, outputFolder);

  // 7. Convert with progress toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Converting to GIF…",
    message: "0%",
  });

  try {
    await convertToGif(settings, outputPath, metadata.duration, (progress) => {
      const remaining = Math.ceil(progress.estimatedRemainingMs / 1000);
      toast.message = `${progress.percentage}%${remaining > 0 ? ` (~${remaining}s remaining)` : ""}`;
    });

    // 8. Get output file size
    const outputStat = await stat(outputPath);
    const sizeStr = formatFileSize(outputStat.size);
    const fileName = outputPath.split("/").pop() || "output.gif";

    // 9. Save to history (don't fail the whole operation if this errors)
    try {
      await addHistoryEntry({
        id: Date.now().toString(),
        inputPath: filePath,
        outputPath,
        fileSize: outputStat.size,
        createdAt: new Date().toISOString(),
        settings,
      });
    } catch (historyError) {
      console.error("Failed to save history entry:", historyError);
    }

    // 10. Show success toast with actions
    await showToast({
      style: Toast.Style.Success,
      title: "GIF Created",
      message: `${fileName} — ${sizeStr}`,
      primaryAction: {
        title: "Reveal in Finder",
        onAction: () => {
          open(outputPath, "com.apple.Finder");
        },
      },
      secondaryAction: {
        title: "Copy to Clipboard",
        onAction: async () => {
          await Clipboard.copy({ file: outputPath });
          await showHUD("GIF copied to clipboard");
        },
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion Failed",
      message: error instanceof Error ? error.message : "FFmpeg encountered an error",
    });
  }
}
