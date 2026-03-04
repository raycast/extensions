import { Form, ActionPanel, Action, showToast, Toast, open } from "@raycast/api";
import { useState } from "react";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface FormValues {
  videoFile: string[];
  speed: string;
  outputFormat: string;
  outputFolder: string[];
  outputFileName: string;
}

const SPEED_OPTIONS = [
  { value: "0.25", title: "0.25x (Very Slow)" },
  { value: "0.5", title: "0.50x (Slow)" },
  { value: "0.75", title: "0.75x (Slightly Slow)" },
  { value: "1", title: "1x (Normal)" },
  { value: "1.25", title: "1.25x (Slightly Fast)" },
  { value: "1.5", title: "1.5x (Fast)" },
  { value: "2", title: "2x (Very Fast)" },
];

const OUTPUT_FORMATS = [
  { value: "same", title: "Same as Input" },
  { value: "mp4", title: "MP4 (.mp4)" },
  { value: "mov", title: "MOV (.mov)" },
  { value: "mkv", title: "MKV (.mkv)" },
  { value: "webm", title: "WebM (.webm)" },
  { value: "avi", title: "AVI (.avi)" },
];

// Supported video file extensions
const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".m4v",
  ".wmv",
  ".flv",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".ogv",
];

// Common ffmpeg installation paths on macOS
const FFMPEG_PATHS = [
  "/opt/homebrew/bin/ffmpeg", // Apple Silicon Homebrew
  "/usr/local/bin/ffmpeg", // Intel Homebrew
  "/usr/bin/ffmpeg", // System installation
  "/opt/local/bin/ffmpeg", // MacPorts
];

// Common ffprobe installation paths on macOS
const FFPROBE_PATHS = [
  "/opt/homebrew/bin/ffprobe", // Apple Silicon Homebrew
  "/usr/local/bin/ffprobe", // Intel Homebrew
  "/usr/bin/ffprobe", // System installation
  "/opt/local/bin/ffprobe", // MacPorts
];

function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

async function findFfmpegPath(): Promise<string | null> {
  // First check common installation paths
  for (const ffmpegPath of FFMPEG_PATHS) {
    if (fs.existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
  }

  // Fallback: try to find via shell with expanded PATH
  try {
    const { stdout } = await execAsync(
      'eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)" 2>/dev/null; which ffmpeg',
      { shell: "/bin/zsh" },
    );
    const ffmpegPath = stdout.trim();
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
  } catch {
    // Ignore errors from fallback
  }

  return null;
}

async function findFfprobePath(): Promise<string | null> {
  // First check common installation paths
  for (const ffprobePath of FFPROBE_PATHS) {
    if (fs.existsSync(ffprobePath)) {
      return ffprobePath;
    }
  }

  // Fallback: try to find via shell with expanded PATH
  try {
    const { stdout } = await execAsync(
      'eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)" 2>/dev/null; which ffprobe',
      { shell: "/bin/zsh" },
    );
    const ffprobePath = stdout.trim();
    if (ffprobePath && fs.existsSync(ffprobePath)) {
      return ffprobePath;
    }
  } catch {
    // Ignore errors from fallback
  }

  return null;
}

async function getVideoDuration(ffprobePath: string, videoPath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? null : duration;
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(2);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<string[]>([]);
  const [videoFileError, setVideoFileError] = useState<string | undefined>();
  const [outputFileName, setOutputFileName] = useState<string>("");

  const handleVideoFileChange = (files: string[]) => {
    setVideoFile(files);
    setVideoFileError(undefined);

    if (files.length > 0) {
      const inputPath = files[0];

      // Validate video file format
      if (!isVideoFile(inputPath)) {
        setVideoFileError(`Invalid format. Supported: ${VIDEO_EXTENSIONS.join(", ")}`);
        return;
      }

      const baseName = path.basename(inputPath, path.extname(inputPath));
      setOutputFileName(`${baseName}_speed_changed`);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      // Find ffmpeg installation
      const ffmpegPath = await findFfmpegPath();
      if (!ffmpegPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "FFmpeg Not Found",
          message: "Please install ffmpeg: brew install ffmpeg",
        });
        return;
      }

      // Validate inputs
      if (!values.videoFile || values.videoFile.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Video Selected",
          message: "Please select a video file",
        });
        return;
      }

      const inputPath = values.videoFile[0];

      // Validate video file format
      if (!isVideoFile(inputPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid File Format",
          message: `Please select a video file. Supported formats: ${VIDEO_EXTENSIONS.join(", ")}`,
        });
        return;
      }

      if (!values.outputFolder || values.outputFolder.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Output Folder",
          message: "Please select an output folder",
        });
        return;
      }

      if (!values.outputFileName || values.outputFileName.trim() === "") {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Output Filename",
          message: "Please enter an output filename",
        });
        return;
      }

      const outputFolder = values.outputFolder[0];
      const speed = parseFloat(values.speed);
      const inputExtension = path.extname(inputPath);

      // Determine output extension based on format choice
      const outputExtension = values.outputFormat === "same" ? inputExtension : `.${values.outputFormat}`;

      const outputPath = path.join(outputFolder, `${values.outputFileName.trim()}${outputExtension}`);

      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "File Not Found",
          message: "The selected video file does not exist",
        });
        return;
      }

      // Check if output file already exists
      if (fs.existsSync(outputPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "File Already Exists",
          message: "A file with this name already exists in the output folder",
        });
        return;
      }

      // Find ffprobe and get input video duration
      const ffprobePath = await findFfprobePath();
      let inputDuration: number | null = null;
      if (ffprobePath) {
        inputDuration = await getVideoDuration(ffprobePath, inputPath);
      }

      // Show processing toast
      const processingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Processing Video",
        message: `Changing speed to ${speed}x...`,
      });

      // Calculate ffmpeg filters
      // Video: setpts filter - lower value = faster playback
      // For speed > 1 (faster): PTS is divided (e.g., 2x speed = PTS/2)
      // For speed < 1 (slower): PTS is multiplied (e.g., 0.5x speed = PTS*2)
      const videoPts = 1 / speed;

      // Audio: atempo filter - accepts values between 0.5 and 2.0
      // For values outside this range, chain multiple atempo filters
      const atempoFilters: string[] = [];
      let tempSpeed = speed;

      // Handle speeds greater than 2 or less than 0.5 by chaining atempo filters
      while (tempSpeed > 2.0) {
        atempoFilters.push("atempo=2.0");
        tempSpeed /= 2.0;
      }
      while (tempSpeed < 0.5) {
        atempoFilters.push("atempo=0.5");
        tempSpeed /= 0.5;
      }
      atempoFilters.push(`atempo=${tempSpeed}`);

      const audioFilter = atempoFilters.join(",");
      const videoFilter = `setpts=${videoPts}*PTS`;

      // Execute ffmpeg with execFileAsync to prevent shell injection
      await execFileAsync(ffmpegPath, [
        "-i",
        inputPath,
        "-filter:v",
        videoFilter,
        "-filter:a",
        audioFilter,
        "-y",
        outputPath,
      ]);

      // Get output file size
      const outputFileStats = fs.statSync(outputPath);
      const outputFileSize = outputFileStats.size;

      // Calculate output duration (input duration / speed)
      const outputDuration = inputDuration !== null ? inputDuration / speed : null;

      // Build summary message with file sizes and durations
      const summaryParts: string[] = [];

      summaryParts.push(`Output: ${formatFileSize(outputFileSize)}`);
      if (outputDuration !== null) {
        summaryParts.push(`${formatDuration(outputDuration)} (${outputDuration.toFixed(2)}s)`);
      }

      // Success
      processingToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Video Processed Successfully",
        message: summaryParts.join(" | "),
        primaryAction: {
          title: "Open File",
          onAction: () => open(outputPath),
        },
        secondaryAction: {
          title: "Open Folder",
          onAction: () => open(outputFolder),
        },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Processing Failed",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Speedify Video"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process Video" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="videoFile"
        title="Video File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        value={videoFile}
        onChange={handleVideoFileChange}
        error={videoFileError}
        info="Supported formats: MP4, MOV, AVI, MKV, WebM, M4V, WMV, FLV, MPEG, 3GP, OGV"
      />

      <Form.Dropdown id="speed" title="Speed" defaultValue="1" info="Select the playback speed">
        {SPEED_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="outputFormat" title="Output Format" defaultValue="same" info="Choose the output video format">
        {OUTPUT_FORMATS.map((format) => (
          <Form.Dropdown.Item key={format.value} value={format.value} title={format.title} />
        ))}
      </Form.Dropdown>

      <Form.FilePicker
        id="outputFolder"
        title="Output Folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={[os.homedir() + "/Desktop"]}
        info="Select where to save the processed video"
      />

      <Form.TextField
        id="outputFileName"
        title="Output Filename"
        placeholder="Enter output filename (without extension)"
        value={outputFileName}
        onChange={setOutputFileName}
        info="The file extension will be added automatically based on the output format"
      />
    </Form>
  );
}
