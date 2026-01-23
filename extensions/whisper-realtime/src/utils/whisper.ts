import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { getPreferenceValues } from "@raycast/api";

export interface TranscriptionEvent {
  type: "partial" | "final" | "status" | "error" | "level" | "spectrum";
  speaker?: string;
  text?: string;
  status?: string;
  message?: string;
  error?: string;
  level?: number;
  spectrum?: number[];
  timestamp?: number;
}

export interface TranscriptionEntry {
  speaker: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface WhisperPreferences {
  whisperRealtimePath: string;
  model: string;
  language: string;
  enableSpeaker: boolean;
  outputDirectory: string;
  enableRecording: boolean;
  audioSource: "mic" | "system" | "both";
  processingStep: string;
  processingLength: string;
  enableVad: boolean;
}

// Speaker colors for display (matching whisper-realtime's colors)
export const SPEAKER_COLORS = {
  話者0: "#00CED1", // cyan
  話者1: "#32CD32", // green
  話者2: "#FFD700", // yellow
  話者3: "#FF00FF", // magenta
  話者4: "#1E90FF", // blue
  話者5: "#FF6347", // red
  default: "#808080", // gray
};

export function getSpeakerColor(speaker: string): string {
  return (
    SPEAKER_COLORS[speaker as keyof typeof SPEAKER_COLORS] ||
    SPEAKER_COLORS.default
  );
}

export interface StartOptions {
  recordingPath?: string;
  enableSpeaker?: boolean; // Override preference
  useVoiceSingle?: boolean; // Use voice-single command for better accuracy
  deviceId?: number; // Microphone device ID
  systemDeviceId?: number; // System audio device ID (BlackHole)
  audioSource?: "mic" | "system" | "both"; // Audio source override
  processingStep?: number; // Processing step (ms)
  processingLength?: number; // Processing window length (ms)
  enableVad?: boolean; // VAD enable override
}

export class WhisperRealtimeProcess extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private entries: TranscriptionEntry[] = [];
  private currentPartial: TranscriptionEntry | null = null;
  private recordingPath: string | null = null;
  private useVoiceSingle = false;

  constructor() {
    super();
  }

  start(options?: StartOptions | string): void {
    if (this.isRunning) {
      return;
    }

    // Support legacy string argument (recordingPath) for backwards compatibility
    const opts: StartOptions =
      typeof options === "string" ? { recordingPath: options } : options || {};

    const preferences = getPreferenceValues<WhisperPreferences>();
    const projectPath = preferences.whisperRealtimePath;

    let args: string[];
    const useVoiceSingle = opts.useVoiceSingle || false;

    if (useVoiceSingle) {
      // Use voice-single command for better accuracy (AquaVoice-style)
      // Use --project flag like Swift MenuBar implementation
      args = [
        "run",
        "--project",
        projectPath,
        "whisper-realtime",
        "voice-single",
        "--model",
        preferences.model || "large-v3-turbo",
        "--language",
        preferences.language || "ja",
      ];

      // Add device ID if specified
      if (opts.deviceId !== undefined) {
        args.push("--device", opts.deviceId.toString());
      }
    } else {
      // Use start command with JSON output (for transcription mode)
      args = [
        "run",
        "whisper-realtime",
        "start",
        "--model",
        preferences.model || "large-v3-turbo",
        "--language",
        preferences.language || "ja",
        "--output-format",
        "json",
      ];

      // Audio source (use option override if provided, otherwise use preference)
      const audioSource = opts.audioSource || preferences.audioSource || "mic";
      args.push("--source", audioSource);

      // Processing step (use option override if provided, otherwise use preference)
      const processingStep =
        opts.processingStep ??
        parseInt(preferences.processingStep || "500", 10);
      args.push("--step", processingStep.toString());

      // Processing length (use option override if provided, otherwise use preference)
      const processingLength =
        opts.processingLength ??
        parseInt(preferences.processingLength || "3000", 10);
      args.push("--length", processingLength.toString());

      // VAD (use option override if provided, otherwise use preference)
      const enableVad =
        opts.enableVad !== undefined
          ? opts.enableVad
          : preferences.enableVad !== false;
      if (enableVad) {
        args.push("--vad");
      } else {
        args.push("--no-vad");
      }

      // Use option override if provided, otherwise use preference
      const enableSpeaker =
        opts.enableSpeaker !== undefined
          ? opts.enableSpeaker
          : preferences.enableSpeaker;
      if (enableSpeaker) {
        args.push("--speaker");
      }

      // Add device ID if specified
      if (opts.deviceId !== undefined) {
        args.push("--device", opts.deviceId.toString());
      }

      // Add system device ID if specified
      if (opts.systemDeviceId !== undefined) {
        args.push("--system-device", opts.systemDeviceId.toString());
      }

      // Add recording option if enabled
      if (opts.recordingPath) {
        args.push("--record", opts.recordingPath);
        this.recordingPath = opts.recordingPath;
      } else {
        this.recordingPath = null;
      }
    }

    console.log("whisper spawn: uv", args.join(" "));
    console.log("whisper cwd:", projectPath);

    this.process = spawn("uv", args, {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env["PATH"] || ""}`,
      },
    });

    this.emit("debug", `pid: ${this.process.pid}`);

    // Store mode for output parsing
    this.useVoiceSingle = useVoiceSingle;

    this.isRunning = true;
    this.entries = [];
    this.currentPartial = null;

    // For voice-single mode, emit recording status immediately
    if (useVoiceSingle) {
      // Small delay to ensure listeners are ready
      setTimeout(() => {
        this.emit("status", {
          status: "recording",
          message: "🎤 Listening...",
        });
      }, 100);
    }

    this.process.stdout?.on("data", (data: Buffer) => {
      const rawData = data.toString();
      this.emit("debug", `stdout: ${rawData.substring(0, 100)}`);
      const lines = rawData.split("\n").filter(Boolean);
      for (const line of lines) {
        if (this.useVoiceSingle) {
          // Parse PARTIAL:/FINAL:/LEVEL:/SPECTRUM: format from voice-single command
          if (line.startsWith("LEVEL:")) {
            const levelStr = line.substring(6);
            const level = parseFloat(levelStr);
            if (!isNaN(level)) {
              this.emit("level", level);
            }
          } else if (line.startsWith("SPECTRUM:")) {
            const spectrumStr = line.substring(9);
            const spectrum = spectrumStr.split(",").map((s) => parseFloat(s));
            if (spectrum.length > 0 && !spectrum.some(isNaN)) {
              this.emit("spectrum", spectrum);
            }
          } else if (line.startsWith("PARTIAL:")) {
            const text = line.substring(8);
            this.currentPartial = {
              speaker: "",
              text,
              timestamp: 0,
              isFinal: false,
            };
            this.emit("partial", this.currentPartial);
            this.emit("update", this.getAllEntries());
          } else if (line.startsWith("FINAL:")) {
            const text = line.substring(6);
            if (text) {
              const entry: TranscriptionEntry = {
                speaker: "",
                text,
                timestamp: 0,
                isFinal: true,
              };
              this.entries.push(entry);
              this.currentPartial = null;
              this.emit("final", entry);
              this.emit("update", this.getAllEntries());
            }
          }
          // Emit recording status when we receive first output
          if (!this.entries.length && !this.currentPartial) {
            this.emit("status", { status: "recording", message: "" });
          }
        } else {
          // Parse JSON format from start command
          try {
            const event = JSON.parse(line) as TranscriptionEvent;
            this.handleEvent(event);
          } catch {
            // Ignore non-JSON lines
            this.emit("debug", `non-json: ${line.substring(0, 50)}`);
          }
        }
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const stderrData = data.toString();
      this.emit("debug", `stderr: ${stderrData.substring(0, 100)}`);
      // For voice-single mode, stderr might contain useful output
      if (this.useVoiceSingle) {
        // Parse PARTIAL:/FINAL: from stderr too (Swift implementation pipes both)
        const lines = stderrData.split("\n").filter(Boolean);
        for (const line of lines) {
          if (line.includes("PARTIAL:")) {
            const idx = line.indexOf("PARTIAL:");
            const text = line.substring(idx + 8);
            this.currentPartial = {
              speaker: "",
              text,
              timestamp: 0,
              isFinal: false,
            };
            this.emit("partial", this.currentPartial);
            this.emit("update", this.getAllEntries());
          } else if (line.includes("FINAL:")) {
            const idx = line.indexOf("FINAL:");
            const text = line.substring(idx + 6);
            if (text) {
              const entry: TranscriptionEntry = {
                speaker: "",
                text,
                timestamp: 0,
                isFinal: true,
              };
              this.entries.push(entry);
              this.currentPartial = null;
              this.emit("final", entry);
              this.emit("update", this.getAllEntries());
            }
          }
        }
      }
      console.error("stderr:", stderrData);
    });

    this.process.on("close", (code) => {
      this.isRunning = false;
      this.emit("close", code);
    });

    this.process.on("error", (error) => {
      this.isRunning = false;
      this.emit("error", error);
    });
  }

  private handleEvent(event: TranscriptionEvent): void {
    switch (event.type) {
      case "partial":
        this.currentPartial = {
          speaker: event.speaker || "",
          text: event.text || "",
          timestamp: event.timestamp || 0,
          isFinal: false,
        };
        this.emit("partial", this.currentPartial);
        break;

      case "final": {
        const entry: TranscriptionEntry = {
          speaker: event.speaker || "",
          text: event.text || "",
          timestamp: event.timestamp || 0,
          isFinal: true,
        };
        this.entries.push(entry);
        this.currentPartial = null;
        this.emit("final", entry);
        break;
      }

      case "status":
        this.emit("status", {
          status: event.status,
          message: event.message,
        });
        break;

      case "error":
        this.emit("error", new Error(event.error || "Unknown error"));
        break;

      case "level":
        if (event.level !== undefined) {
          this.emit("level", event.level);
        }
        break;
    }

    this.emit("update", this.getAllEntries());
  }

  stop(): void {
    if (this.process && this.isRunning) {
      // Send SIGINT to gracefully stop
      this.process.kill("SIGINT");

      // Force kill after 2 seconds if still running
      setTimeout(() => {
        if (this.process && this.isRunning) {
          this.forceStop();
        }
      }, 2000);
    }
  }

  forceStop(): void {
    if (this.process) {
      // Kill the process tree (including child processes)
      try {
        // First try SIGTERM
        this.process.kill("SIGTERM");
        // Then force with SIGKILL after a short delay
        setTimeout(() => {
          if (this.process) {
            try {
              this.process.kill("SIGKILL");
            } catch {
              // Process already dead
            }
          }
        }, 500);
      } catch {
        // Process already dead
      }
    }
    this.isRunning = false;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getEntries(): TranscriptionEntry[] {
    return [...this.entries];
  }

  getCurrentPartial(): TranscriptionEntry | null {
    return this.currentPartial;
  }

  getAllEntries(): TranscriptionEntry[] {
    const result = [...this.entries];
    if (this.currentPartial) {
      result.push(this.currentPartial);
    }
    return result;
  }

  getFullText(includePartial = true): string {
    const entries = includePartial ? this.getAllEntries() : this.entries;
    const preferences = getPreferenceValues<WhisperPreferences>();

    return entries
      .map((entry) => {
        if (preferences.enableSpeaker && entry.speaker) {
          return `[${entry.speaker}] ${entry.text}`;
        }
        return entry.text;
      })
      .join("\n");
  }

  clear(): void {
    this.entries = [];
    this.currentPartial = null;
  }

  getRecordingPath(): string | null {
    return this.recordingPath;
  }
}

// Generate recording filename with timestamp
export function generateRecordingFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `recording-${timestamp}.wav`;
}

// Singleton instance for the transcription process
let whisperProcess: WhisperRealtimeProcess | null = null;

export function getWhisperProcess(): WhisperRealtimeProcess {
  if (!whisperProcess) {
    whisperProcess = new WhisperRealtimeProcess();
  }
  return whisperProcess;
}

export function resetWhisperProcess(): void {
  if (whisperProcess) {
    whisperProcess.forceStop();
    whisperProcess.removeAllListeners();
    whisperProcess = null;
  }
}

// Kill all whisper-related processes (emergency cleanup)
export async function killAllWhisperProcesses(): Promise<void> {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    await execAsync(
      "pkill -f 'whisper-realtime voice-single' 2>/dev/null || true",
    );
    await execAsync("pkill -f 'whisper-cli' 2>/dev/null || true");
  } catch {
    // Ignore errors
  }
}
