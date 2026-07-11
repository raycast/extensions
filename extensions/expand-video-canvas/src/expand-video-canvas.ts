import {
  showToast,
  Toast,
  getSelectedFinderItems,
  open,
  confirmAlert,
  showHUD,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

async function findFFmpegPath(): Promise<string | null> {
  const commonPaths = ["/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/bin/ffmpeg"];

  for (const ffmpegPath of commonPaths) {
    try {
      await fs.access(ffmpegPath);
      return ffmpegPath;
    } catch {
      // Path doesn't exist, continue to next path
    }
  }

  try {
    const { stdout } = await execAsync("which ffmpeg");
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function installFFmpeg() {
  const installCommand = "brew install ffmpeg";
  const options = {
    title: "FFmpeg Not Found",
    message: `FFmpeg is not installed. Please install it using Homebrew with the following command:\n\n${installCommand}\n\nAfter installation, please restart Raycast and run this command again.`,
    primaryAction: {
      title: "Copy Install Command",
      onAction: () => {
        exec(`echo "${installCommand}" | pbcopy`);
      },
    },
    dismissAction: {
      title: "Cancel",
    },
  };

  await confirmAlert(options);
  await showToast({
    style: Toast.Style.Success,
    title: "Install Command Copied",
    message: "Paste it in Terminal to install FFmpeg",
  });
}

async function getEdgeColor(ffmpegPath: string, videoPath: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(path.dirname(videoPath), "temp-"));
  const framePath = path.join(tempDir, "first_frame.png");

  try {
    // Extract the first frame
    await execAsync(`"${ffmpegPath}" -i "${videoPath}" -vframes 1 "${framePath}"`);

    // Use ImageMagick to get the most common color of the top 10 pixels
    const command = `PATH=/usr/local/bin:/opt/homebrew/bin:$PATH magick "${framePath}" -gravity North -crop 100%x10+0+0 +repage -colors 1 -unique-colors -format "%[hex:u]" info:`;
    const { stdout } = await execAsync(command);

    // The output should be in the format "#RRGGBB"
    const hexColor = stdout.trim().replace("#", "");
    if (/^[0-9A-Fa-f]{6}$/.test(hexColor)) {
      return hexColor;
    } else {
      console.error("Unexpected ImageMagick output format:", stdout);
      return "000000"; // Default to black if output format is unexpected
    }
  } catch (error) {
    console.error("Error getting edge color:", error);
    return "000000"; // Default to black on error
  } finally {
    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function processVideo(ffmpegPath: string, videoPath: string, edgeColor: string): Promise<string> {
  const outputPath = path.join(
    path.dirname(videoPath),
    `${path.basename(videoPath, path.extname(videoPath))}_padded${path.extname(videoPath)}`,
  );
  const paddingCommand = `"${ffmpegPath}" -i "${videoPath}" -vf "scale='min(1920*0.8,iw)':'min(1080*0.8,ih)':force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x${edgeColor}" -c:a copy "${outputPath}"`;

  try {
    const { stderr } = await execAsync(paddingCommand);
    console.log("FFmpeg padding output:", stderr);
    return outputPath;
  } catch (error) {
    console.error("Error during video padding:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw new Error("Failed to process video");
  }
}

export default async function Command() {
  try {
    await closeMainWindow();
    await showHUD("Checking for FFmpeg...");

    const ffmpegPath = await findFFmpegPath();
    if (!ffmpegPath) {
      await showHUD("FFmpeg not found");
      await installFFmpeg();
      await popToRoot();
      return;
    }

    // Check for ImageMagick
    try {
      await execAsync("PATH=/usr/local/bin:/opt/homebrew/bin:$PATH magick -version");
    } catch (error) {
      await showHUD("ImageMagick not found");
      await confirmAlert({
        title: "ImageMagick Not Found",
        message:
          "ImageMagick is required for this operation. Please install it using Homebrew with the command:\n\nbrew install imagemagick\n\nAfter installation, please restart Raycast and run this command again.",
        primaryAction: {
          title: "Copy Install Command",
          onAction: () => {
            exec(`echo "brew install imagemagick" | pbcopy`);
          },
        },
      });
      await popToRoot();
      return;
    }

    await showHUD("Selecting video...");
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length !== 1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select exactly one video file",
      });
      await popToRoot();
      return;
    }

    const videoPath = selectedItems[0].path;

    await showHUD("Getting edge color...");
    const edgeColor = await getEdgeColor(ffmpegPath, videoPath);
    console.log("Edge color:", edgeColor);

    await showHUD("Processing video...");
    console.log("Processing video with color:", edgeColor);
    const outputPath = await processVideo(ffmpegPath, videoPath, edgeColor);

    await showHUD("Video processed successfully!");
    await open(outputPath);
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "An error occurred while processing the video",
    });
  } finally {
    await popToRoot();
  }
}
