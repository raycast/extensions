import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  showInFinder,
  open,
  Detail
} from "@raycast/api";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec, spawn } from "node:child_process";

// ⚠️ Environment Patch: Raycast GUI app doesn't load shell configuration (.zshrc),
// so we manually inject Homebrew's standard binary paths into process.env.PATH.
const homebrewPaths = ["/opt/homebrew/bin", "/usr/local/bin"];
const pathDirs = process.env.PATH ? process.env.PATH.split(":") : [];
for (const p of homebrewPaths) {
  if (!pathDirs.includes(p)) {
    pathDirs.unshift(p);
  }
}
process.env.PATH = pathDirs.join(":");

// 🔍 Absolute Path Resolution: Bypasses standard PATH lookup entirely by using
// direct paths when they exist in common homebrew or system directories.
let ffmpegPath = "ffmpeg";
let ffprobePath = "ffprobe";
let hasFFmpegResolved = false;

const possiblePaths = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
];

for (const dir of possiblePaths) {
  const ffmpegTest = path.join(dir, "ffmpeg");
  const ffprobeTest = path.join(dir, "ffprobe");
  if (existsSync(ffmpegTest) && existsSync(ffprobeTest)) {
    ffmpegPath = ffmpegTest;
    ffprobePath = ffprobeTest;
    hasFFmpegResolved = true;
    break;
  }
}

interface VideoFile {
  name: string;
  path: string;
  size: number;
  mtime: Date;
}

// Format file size in a human-readable way
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Calculate relative time (e.g., "5 mins ago", "Just now")
function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Helper to construct FFmpeg's audio tempo filter chain
// atempo only supports multipliers between 0.5 and 2.0.
// For higher speeds (e.g. 3x, 4x), we chain them, e.g. "atempo=2.0,atempo=1.5".
function getAudioFilter(speed: number): string {
  if (speed === 1) return "";
  let current = speed;
  const filters: string[] = [];
  while (current > 2.0) {
    filters.push("atempo=2.0");
    current /= 2.0;
  }
  while (current < 0.5) {
    filters.push("atempo=0.5");
    current /= 0.5;
  }
  if (current !== 1.0) {
    filters.push(`atempo=${current.toFixed(2)}`);
  }
  return filters.join(",");
}

export default function Command() {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFFmpeg, setHasFFmpeg] = useState<boolean | null>(null);

  const desktopPath = path.join(os.homedir(), "Desktop");

  // Check if FFmpeg and FFprobe are installed
  const checkFFmpeg = useCallback(() => {
    if (hasFFmpegResolved) {
      setHasFFmpeg(true);
      return;
    }
    exec(`"${ffmpegPath}" -version && "${ffprobePath}" -version`, (error) => {
      if (error) {
        setHasFFmpeg(false);
      } else {
        setHasFFmpeg(true);
      }
    });
  }, []);

  // Fetch and filter video files from Desktop
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fs.readdir(desktopPath);
      const videoList: VideoFile[] = [];

      const videoExtensions = [".mov", ".mp4", ".m4v", ".mkv", ".avi", ".webm"];

      for (const item of items) {
        // Skip hidden files
        if (item.startsWith(".")) continue;

        const filePath = path.join(desktopPath, item);
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (videoExtensions.includes(ext)) {
              videoList.push({
                name: item,
                path: filePath,
                size: stats.size,
                mtime: stats.mtime,
              });
            }
          }
        } catch {
          // Skip unreadable files/folders
        }
      }

      // Sort files by modification time (most recent first)
      videoList.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      setFiles(videoList);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan Desktop",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [desktopPath]);

  // Run checks and load files on mount
  useEffect(() => {
    checkFFmpeg();
    loadFiles();
  }, [checkFFmpeg, loadFiles]);

  // Handle video conversion
  const handleConvert = async (file: VideoFile, speed: number) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Starting conversion for ${file.name}...`,
    });

    try {
      // 1. Detect if the video has an audio stream
      const checkAudioPromise = new Promise<boolean>((resolve) => {
        const ffprobeCmd = `"${ffprobePath}" -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${file.path}"`;
        exec(ffprobeCmd, (error, stdout) => {
          if (error) {
            resolve(false); // If error or no audio, assume no audio
          } else {
            resolve(stdout.trim().includes("audio"));
          }
        });
      });

      const hasAudio = await checkAudioPromise;

      // 2. Generate non-conflicting output filename
      const ext = path.extname(file.name);
      const baseName = path.basename(file.name, ext);
      const speedStr = speed.toString().replace(".", "x");
      let outputName = `${baseName}_${speedStr}${ext}`;
      let outputPath = path.join(desktopPath, outputName);
      
      let counter = 1;
      while (true) {
        try {
          await fs.access(outputPath);
          // If file exists, append counter
          outputName = `${baseName}_${speedStr}_${counter}${ext}`;
          outputPath = path.join(desktopPath, outputName);
          counter++;
        } catch {
          // File does not exist, safe to use
          break;
        }
      }

      // 3. Formulate FFmpeg command arguments
      const args = ["-y", "-i", file.path];

      if (hasAudio) {
        const vFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`;
        const aFilter = getAudioFilter(speed);
        args.push(
          "-filter_complex",
          `[0:v]${vFilter}[v];[0:a]${aFilter}[a]`,
          "-map",
          "[v]",
          "-map",
          "[a]"
        );
      } else {
        const vFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`;
        args.push(
          "-filter_complex",
          `[0:v]${vFilter}[v]`,
          "-map",
          "[v]"
        );
      }
      
      args.push(outputPath);

      // 4. Spawn FFmpeg process
      toast.title = `Converting ${file.name} to ${speed}x...`;
      
      const ffmpegProcess = spawn(ffmpegPath, args);
      let isCancelled = false;

      // Provide cancel button in Toast
      toast.primaryAction = {
        title: "Cancel",
        onAction: () => {
          isCancelled = true;
          ffmpegProcess.kill("SIGKILL");
        },
      };

      // Read FFmpeg stderr to parse current progress
      ffmpegProcess.stderr.on("data", (data: Buffer) => {
        const line = data.toString();
        const timeMatch = line.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        const speedMatch = line.match(/speed=\s*(\d+\.?\d*x)/);
        if (timeMatch || speedMatch) {
          let msg = `Processing ${speed}x speedup...`;
          if (timeMatch) msg += ` (Processed: ${timeMatch[1]})`;
          if (speedMatch) msg += ` at ${speedMatch[1]}`;
          toast.message = msg;
        }
      });

      // Handle process completion
      const exitCode = await new Promise<number | null>((resolve) => {
        ffmpegProcess.on("exit", (code) => {
          resolve(code);
        });
      });

      if (isCancelled) {
        toast.style = Toast.Style.Failure;
        toast.title = "Conversion cancelled";
        toast.message = "The FFmpeg process was terminated.";
        toast.primaryAction = undefined;

        // Clean up partial output file
        try {
          await fs.unlink(outputPath);
        } catch {
          // ignore
        }
        return;
      }

      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with error code ${exitCode}`);
      }

      // 5. Success Toast
      toast.style = Toast.Style.Success;
      toast.title = "Conversion Complete!";
      toast.message = `Saved as ${outputName}`;
      
      // Post-conversion shortcut actions in the Toast itself
      toast.primaryAction = {
        title: "Reveal in Finder",
        onAction: () => {
          showInFinder(outputPath);
        },
      };
      
      toast.secondaryAction = {
        title: "Play Video",
        onAction: () => {
          open(outputPath);
        },
      };

      // Refresh list to show the new converted file if needed
      await loadFiles();

    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Conversion Failed";
      toast.message = err instanceof Error ? err.message : String(err);
      toast.primaryAction = undefined;
      toast.secondaryAction = undefined;
    }
  };

  // If FFmpeg is checking or missing
  if (hasFFmpeg === false) {
    return (
      <Detail
        markdown={`# ⚠️ FFmpeg is Not Installed

This plugin requires **FFmpeg** and **FFprobe** to be installed on your Mac and available in your shell's PATH.

### How to Install:

1. Open your **Terminal** application.
2. Install via [Homebrew](https://brew.sh/):
   \`\`\`bash
   brew install ffmpeg
   \`\`\`
3. Once the installation is complete, close and reopen Raycast, or run this command again.

*If you already installed it and are still seeing this, please verify that \`ffmpeg\` and \`ffprobe\` are present in your system's search PATH.*`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.RotateClockwise} onAction={checkFFmpeg} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter files by name..."
    >
      {files.length === 0 ? (
        <List.EmptyView
          title="No recordings found on Desktop"
          description="Make sure you have video files (.mov, .mp4, etc.) in your Desktop folder."
          icon={Icon.Video}
        />
      ) : (
        files.map((file) => (
          <List.Item
            key={file.path}
            icon={Icon.Video}
            title={file.name}
            subtitle={formatSize(file.size)}
            accessories={[{ text: getRelativeTime(file.mtime), tooltip: file.mtime.toLocaleString() }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Conversion Actions">
                  <Action
                    title="Speed Up 2x"
                    icon={Icon.Forward}
                    onAction={() => handleConvert(file, 2.0)}
                  />
                  <Action
                    title="Speed Up 1.5x"
                    icon={Icon.ChevronRight}
                    onAction={() => handleConvert(file, 1.5)}
                  />
                  <Action
                    title="Speed Up 3x"
                    icon={Icon.Forward}
                    onAction={() => handleConvert(file, 3.0)}
                  />
                  <Action
                    title="Speed Up 4x"
                    icon={Icon.Forward}
                    onAction={() => handleConvert(file, 4.0)}
                  />
                  <Action
                    title="Slow Motion 0.5x"
                    icon={Icon.ChevronLeft}
                    onAction={() => handleConvert(file, 0.5)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="File Actions">
                  <Action.ShowInFinder path={file.path} />
                  <Action
                    title="Play Video"
                    icon={Icon.Play}
                    onAction={() => open(file.path)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={file.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Refresh Desktop Files"
                    icon={Icon.RotateClockwise}
                    onAction={loadFiles}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
