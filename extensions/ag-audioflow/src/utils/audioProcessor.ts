import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import { showToast, Toast, Clipboard } from "@raycast/api";
import { execSync } from "child_process";
import { showFailureToast } from "@raycast/utils";

export interface AudioConversionOptions {
  inputPath: string;
  outputPath: string;
  format: "mp3" | "aac" | "wav" | "flac" | "ogg" | "m4a" | "wma";
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
}

export interface TrimSilenceOptions {
  inputPath: string;
  outputPath: string;
  startThreshold?: number;
  endThreshold?: number;
  duration?: number;
}

export interface FadeOptions {
  inputPath: string;
  outputPath: string;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export interface NormalizeOptions {
  inputPath: string;
  outputPath: string;
  targetLevel?: number;
}

export interface VolumeOptions {
  inputPath: string;
  outputPath: string;
  volumeChange: number; // Volume change in dB (positive for increase, negative for decrease)
  useGain?: boolean; // Use gain filter instead of volume filter
}

export interface StereoSplitOptions {
  inputPath: string;
  outputDirectory: string;
  outputBaseName?: string; // Base name for output files, defaults to input filename
}

export interface StereoToMonoOptions {
  inputPath: string;
  outputPath: string;
  mixMethod?: "mix" | "left" | "right"; // How to convert: mix both channels, use left only, or use right only
}

export interface SpeedAdjustOptions {
  inputPath: string;
  outputPath: string;
  speedPercentage: number; // Speed percentage (50 = half speed, 200 = double speed)
  preservePitch?: boolean; // Whether to preserve pitch when changing speed
}

export interface AudioInfo {
  duration: number;
  bitrate: string;
  sampleRate: number;
  channels: number;
  format: string;
  size: number;
}

export class AudioProcessor {
  static findFFmpegPath(): string {
    // Common FFmpeg installation paths
    const possiblePaths = [
      "/opt/homebrew/bin/ffmpeg", // Apple Silicon Homebrew
      "/usr/local/bin/ffmpeg", // Intel Homebrew
      "/usr/bin/ffmpeg", // System installation
      "ffmpeg", // PATH
    ];

    for (const ffmpegPath of possiblePaths) {
      try {
        execSync(`${ffmpegPath} -version`, { stdio: "pipe" });
        return ffmpegPath;
      } catch {
        // Silently continue to next path - don't show error for each failed attempt
        continue;
      }
    }

    return "";
  }

  static initializeFFmpeg(): boolean {
    const ffmpegPath = this.findFFmpegPath();
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      return true;
    }
    return false;
  }

  static async checkFFmpegAvailability(): Promise<boolean> {
    try {
      if (!this.initializeFFmpeg()) {
        return false;
      }

      return new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err) => {
          resolve(!err);
        });
      });
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to check FFmpeg availability",
      });
      return false;
    }
  }

  static async showFFmpegInstallationGuide(): Promise<void> {
    await showToast({
      style: Toast.Style.Failure,
      title: "FFmpeg Required",
      message: "Please install FFmpeg to use AG AudioFlow",
      primaryAction: {
        title: "Installation Guide",
        onAction: () => {
          showToast({
            style: Toast.Style.Animated,
            title: "FFmpeg Installation",
            message: "macOS: Run 'brew install ffmpeg' in Terminal\nOr visit ffmpeg.org for manual installation",
          });
        },
      },
      secondaryAction: {
        title: "Copy Command",
        onAction: async () => {
          await Clipboard.copy("brew install ffmpeg");
          showToast({
            style: Toast.Style.Success,
            title: "Command Copied",
            message: "Paste in Terminal and press Enter",
          });
        },
      },
    });
  }

  static async convertAudio(options: AudioConversionOptions): Promise<void> {
    this.initializeFFmpeg();

    return new Promise((resolve, reject) => {
      let command = ffmpeg(options.inputPath);

      command = command.format(options.format);

      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }

      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }

      if (options.channels) {
        command = command.audioChannels(options.channels);
      }

      command
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
          showToast({
            style: Toast.Style.Animated,
            title: "Converting Audio",
            message: "Processing your audio file...",
          });
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            showToast({
              style: Toast.Style.Animated,
              title: "Converting Audio",
              message: `${Math.round(progress.percent)}% complete`,
            });
          }
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Conversion Complete",
            message: "Audio file converted successfully",
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Conversion Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static async trimSilence(options: TrimSilenceOptions): Promise<void> {
    this.initializeFFmpeg();

    return new Promise((resolve, reject) => {
      const startThreshold = options.startThreshold || -50;
      const endThreshold = options.endThreshold || -50;

      ffmpeg(options.inputPath)
        .audioFilters([
          `silenceremove=start_periods=1:start_duration=1:start_threshold=${startThreshold}dB:detection=peak`,
          `areverse`,
          `silenceremove=start_periods=1:start_duration=1:start_threshold=${endThreshold}dB:detection=peak`,
          `areverse`,
        ])
        .on("start", () => {
          showToast({
            style: Toast.Style.Animated,
            title: "Trimming Silence",
            message: "Removing silence from audio...",
          });
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Trimming Complete",
            message: "Silence removed successfully",
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Trimming Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static async addFadeEffects(options: FadeOptions): Promise<void> {
    const audioInfo = await this.getAudioInfo(options.inputPath);

    return new Promise((resolve, reject) => {
      const filters: string[] = [];

      if (options.fadeInDuration && options.fadeInDuration > 0) {
        filters.push(`afade=t=in:ss=0:d=${options.fadeInDuration}`);
      }

      if (options.fadeOutDuration && options.fadeOutDuration > 0) {
        const startTime = audioInfo.duration - options.fadeOutDuration;
        filters.push(`afade=t=out:st=${startTime}:d=${options.fadeOutDuration}`);
      }

      if (filters.length === 0) {
        reject(new Error("No fade effects specified"));
        return;
      }

      ffmpeg(options.inputPath)
        .audioFilters(filters)
        .on("start", () => {
          showToast({
            style: Toast.Style.Animated,
            title: "Adding Fade Effects",
            message: "Applying fade in/out effects...",
          });
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Fade Effects Added",
            message: "Fade effects applied successfully",
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Fade Effects Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static async normalizeAudio(options: NormalizeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetLevel = options.targetLevel || -23;

      ffmpeg(options.inputPath)
        .audioFilters([`loudnorm=I=${targetLevel}:TP=-2:LRA=7`])
        .on("start", () => {
          showToast({
            style: Toast.Style.Animated,
            title: "Normalizing Audio",
            message: "Normalizing audio levels...",
          });
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Normalization Complete",
            message: "Audio normalized successfully",
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Normalization Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static async getAudioInfo(filePath: string): Promise<AudioInfo> {
    this.initializeFFmpeg();

    const stats = await fs.stat(filePath);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find((stream) => stream.codec_type === "audio");
        if (!audioStream) {
          reject(new Error("No audio stream found"));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          bitrate: metadata.format.bit_rate ? metadata.format.bit_rate.toString() : "Unknown",
          sampleRate: audioStream.sample_rate || 0,
          channels: audioStream.channels || 0,
          format: metadata.format.format_name || "Unknown",
          size: stats.size,
        });
      });
    });
  }

  static async adjustVolume(options: VolumeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const volumeChangeStr = options.volumeChange >= 0 ? `+${options.volumeChange}dB` : `${options.volumeChange}dB`;

      // FIXED: Use correct volume filter syntax
      const filter = `volume=${volumeChangeStr}`;

      ffmpeg(options.inputPath)
        .audioFilters([filter])
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
          showToast({
            style: Toast.Style.Animated,
            title: "Adjusting Volume",
            message: `Changing volume by ${volumeChangeStr}...`,
          });
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            showToast({
              style: Toast.Style.Animated,
              title: "Adjusting Volume",
              message: `${Math.round(progress.percent)}% complete`,
            });
          }
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Volume Adjustment Complete",
            message: `Volume changed by ${volumeChangeStr}`,
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Volume Adjustment Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static async splitStereoToMono(options: StereoSplitOptions): Promise<{ leftPath: string; rightPath: string }> {
    const inputInfo = await this.getAudioInfo(options.inputPath);

    if (inputInfo.channels !== 2) {
      throw new Error("Input file must be stereo (2 channels) to split");
    }

    const baseName = options.outputBaseName || path.parse(options.inputPath).name;
    const extension = path.extname(options.inputPath);
    const leftPath = path.join(options.outputDirectory, `${baseName}_left${extension}`);
    const rightPath = path.join(options.outputDirectory, `${baseName}_right${extension}`);

    return new Promise((resolve, reject) => {
      let completedCount = 0;
      const errors: Error[] = [];

      const checkCompletion = () => {
        completedCount++;
        if (completedCount === 2) {
          if (errors.length > 0) {
            reject(errors[0]);
          } else {
            showToast({
              style: Toast.Style.Success,
              title: "Stereo Split Complete",
              message: "Left and right channels extracted successfully",
            });
            resolve({ leftPath, rightPath });
          }
        }
      };

      // Extract left channel - FIXED: Use correct channel extraction
      ffmpeg(options.inputPath)
        .audioFilters(["pan=mono|c0=c0"]) // Extract only left channel (c0)
        .audioChannels(1)
        .on("start", () => {
          showToast({
            style: Toast.Style.Animated,
            title: "Splitting Stereo",
            message: "Extracting left and right channels...",
          });
        })
        .on("end", checkCompletion)
        .on("error", (err) => {
          errors.push(err);
          checkCompletion();
        })
        .save(leftPath);

      // Extract right channel - FIXED: Use correct channel extraction
      ffmpeg(options.inputPath)
        .audioFilters(["pan=mono|c0=c1"]) // Extract only right channel (c1)
        .audioChannels(1)
        .on("end", checkCompletion)
        .on("error", (err) => {
          errors.push(err);
          checkCompletion();
        })
        .save(rightPath);
    });
  }

  static async convertStereoToMono(options: StereoToMonoOptions): Promise<void> {
    const inputInfo = await this.getAudioInfo(options.inputPath);

    if (inputInfo.channels !== 2) {
      throw new Error("Input file must be stereo (2 channels) to convert to mono");
    }

    return new Promise((resolve, reject) => {
      let audioFilter: string;

      switch (options.mixMethod || "mix") {
        case "left":
          audioFilter = "pan=mono|c0=c0"; // Use left channel only
          break;
        case "right":
          audioFilter = "pan=mono|c0=c1"; // Use right channel only
          break;
        case "mix":
        default:
          audioFilter = "pan=mono|c0=0.5*c0+0.5*c1"; // Mix both channels equally
          break;
      }

      ffmpeg(options.inputPath)
        .audioFilters([audioFilter])
        .audioChannels(1)
        .on("start", () => {
          showToast({
            style: Toast.Style.Animated,
            title: "Converting to Mono",
            message: `Using ${options.mixMethod || "mix"} method...`,
          });
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            showToast({
              style: Toast.Style.Animated,
              title: "Converting to Mono",
              message: `${Math.round(progress.percent)}% complete`,
            });
          }
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Conversion Complete",
            message: "Stereo converted to mono successfully",
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Conversion Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static async adjustSpeed(options: SpeedAdjustOptions): Promise<void> {
    if (options.speedPercentage <= 0) {
      throw new Error("Speed percentage must be greater than 0");
    }

    // FIXED: Get actual sample rate from input file
    const inputInfo = await this.getAudioInfo(options.inputPath);
    const sampleRate = inputInfo.sampleRate;

    return new Promise((resolve, reject) => {
      const speedFactor = options.speedPercentage / 100;

      // FIXED: Improved speed adjustment with better atempo chaining
      const audioFilters: string[] = [];

      if (options.preservePitch) {
        // Use atempo filter which preserves pitch but changes tempo
        if (speedFactor >= 0.5 && speedFactor <= 2.0) {
          audioFilters.push(`atempo=${speedFactor}`);
        } else {
          // FIXED: More efficient atempo chaining with proper limits
          let currentFactor = speedFactor;
          const atempoFilters: string[] = [];

          // Handle speeds > 2.0x
          while (currentFactor > 2.0) {
            atempoFilters.push("atempo=2.0");
            currentFactor /= 2.0;
          }

          // Handle speeds < 0.5x
          while (currentFactor < 0.5) {
            atempoFilters.push("atempo=0.5");
            currentFactor /= 0.5;
          }

          // Add final factor if not 1.0
          if (Math.abs(currentFactor - 1.0) > 0.001) {
            atempoFilters.push(`atempo=${currentFactor.toFixed(3)}`);
          }

          audioFilters.push(...atempoFilters);
        }
      } else {
        // FIXED: Use dynamic sample rate instead of hardcoded 44100
        audioFilters.push(`asetrate=${Math.round(sampleRate * speedFactor)},aresample=${sampleRate}`);
      }

      ffmpeg(options.inputPath)
        .audioFilters(audioFilters)
        .on("start", () => {
          const speedDescription =
            options.speedPercentage > 100
              ? `${options.speedPercentage}% (faster)`
              : `${options.speedPercentage}% (slower)`;

          showToast({
            style: Toast.Style.Animated,
            title: "Adjusting Speed",
            message: `Changing speed to ${speedDescription}...`,
          });
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            showToast({
              style: Toast.Style.Animated,
              title: "Adjusting Speed",
              message: `${Math.round(progress.percent)}% complete`,
            });
          }
        })
        .on("end", () => {
          showToast({
            style: Toast.Style.Success,
            title: "Speed Adjustment Complete",
            message: `Audio speed changed to ${options.speedPercentage}%`,
          });
          resolve();
        })
        .on("error", (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Speed Adjustment Failed",
            message: err.message,
          });
          reject(err);
        })
        .save(options.outputPath);
    });
  }

  static generateOutputPath(inputPath: string, suffix: string, newExtension?: string): string {
    const parsedPath = path.parse(inputPath);
    const extension = newExtension || parsedPath.ext;
    return path.join(parsedPath.dir, `${parsedPath.name}_${suffix}${extension}`);
  }

  static formatFileSize(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  static formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}
