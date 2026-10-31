import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { Settings, executable } from "./core";

export const dictationStorage = {
  model: "dictationModel",
  microphone: "dictationMicrophone",
  language: "dictationLanguage",
  visualizer: "dictationVisualizer",
} as const;

export const defaultMicrophone = "default";

export type AudioInputDevice = {
  index: number;
  name: string;
};

/** Audio inputs printed by `ffmpeg -list_devices true -f avfoundation`. */
export function parseAudioInputDevices(output: string): AudioInputDevice[] {
  const devices: AudioInputDevice[] = [];
  let audio = false;
  for (const line of output.split(/\r?\n/)) {
    if (/AVFoundation audio devices:/i.test(line)) {
      audio = true;
      continue;
    }
    if (/AVFoundation video devices:/i.test(line)) {
      audio = false;
      continue;
    }
    if (!audio) continue;
    const match = /\]\s+\[(\d+)\]\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    devices.push({ index: Number(match[1]), name: match[2] });
  }
  return devices;
}

/** Connected microphones in the same order AVFoundation gives ffmpeg. */
export async function audioInputDevices(
  settings: Settings,
): Promise<AudioInputDevice[]> {
  const ffmpeg = await executable(settings.ffmpegPath, "ffmpeg");
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      ffmpeg,
      ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""],
      { shell: false, windowsHide: true },
    );
    let text = "";
    const collect = (chunk: Buffer | string) => {
      text = (text + chunk.toString()).slice(-40_000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", reject);
    // Listing devices intentionally exits non-zero because there is no input.
    child.once("close", () => resolve(text));
  });
  const devices = parseAudioInputDevices(output);
  if (!devices.length)
    throw new Error(
      "No microphones were found. Connect one and check Raycast's microphone permission.",
    );
  return devices;
}

export type MicrophoneRecording = {
  microphone: string;
  stop: () => Promise<void>;
};

/** Maps ffmpeg's RMS level in decibels to a responsive visualizer value. */
export function normalizedAudioLevel(decibels: number): number {
  if (!Number.isFinite(decibels)) return 0;
  const linear = Math.max(0, Math.min(1, (decibels + 55) / 45));
  return Math.pow(linear, 0.7);
}

/** Starts an AVFoundation recording directly in whisper.cpp's WAV format. */
export async function startMicrophoneRecording(
  target: string,
  microphone: string | undefined,
  settings: Settings,
  onLevel?: (level: number) => void,
): Promise<MicrophoneRecording> {
  const ffmpeg = await executable(settings.ffmpegPath, "ffmpeg");
  let input = ":default";
  let label = "System Default";
  if (microphone && microphone !== defaultMicrophone) {
    input = `:${microphone}`;
    label = microphone;
  }

  let stopping = false;
  let ready = false;
  let readyResolve: (() => void) | undefined;
  let readyReject: ((error: Error) => void) | undefined;
  let stderr = "";
  let force: ReturnType<typeof setTimeout> | undefined;
  const child = spawn(
    ffmpeg,
    [
      "-hide_banner",
      "-nostats",
      "-loglevel",
      "info",
      "-f",
      "avfoundation",
      "-i",
      input,
      "-map",
      "0:a:0",
      "-af",
      "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      "-f",
      "wav",
      "-y",
      target,
    ],
    { shell: false, windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
  );
  child.stderr.setEncoding("utf8");
  const listening = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  let levelBuffer = "";
  let lastLevel = 0;
  child.stderr.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-12_000);
    levelBuffer += chunk;
    const lines = levelBuffer.split(/\r?\n/);
    levelBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const match = /RMS_level=(-?[\d.]+|-inf)/i.exec(line);
      if (!match || Date.now() - lastLevel < 45) continue;
      lastLevel = Date.now();
      onLevel?.(normalizedAudioLevel(Number(match[1])));
    }
    if (!ready && /Output #0|Press \[q\] to stop/.test(stderr)) {
      ready = true;
      readyResolve?.();
    }
  });

  const finished = new Promise<void>((resolve, reject) => {
    child.once("error", (error) => {
      readyReject?.(error);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (force) clearTimeout(force);
      if (code === 0 || (stopping && code === 255) || signal === "SIGINT") {
        if (!ready)
          readyReject?.(
            new Error("The microphone stopped before recording started."),
          );
        resolve();
        return;
      }
      const error = new Error(
        `ffmpeg could not record the microphone${code === null ? "" : ` (${code})`}: ${stderr.trim() || "No details available"}`,
      );
      readyReject?.(error);
      reject(error);
    });
  });
  const finishRecording = () => {
    if (stopping) return;
    stopping = true;
    child.stdin.end();
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGINT");
      force = setTimeout(() => child.kill("SIGKILL"), 1_500);
    }
  };
  // A rejection before release is observed again from stop(), not as an unhandled promise.
  void finished.catch(() => undefined);
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  let startTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      listening,
      new Promise<never>((_, reject) => {
        startTimeout = setTimeout(
          () => reject(new Error("The microphone took too long to start.")),
          10_000,
        );
      }),
    ]);
  } catch (error) {
    finishRecording();
    await finished.catch(() => undefined);
    throw error;
  } finally {
    if (startTimeout) clearTimeout(startTimeout);
  }

  return {
    microphone: label,
    async stop() {
      finishRecording();
      await finished;
      const info = await stat(target).catch(() => undefined);
      if (!info || info.size <= 44)
        throw new Error("The microphone did not record any audio.");
    },
  };
}

export type HotkeyEnd = "released" | "canceled" | "timeout" | "not-held";

export type HotkeyWatch = {
  held: Promise<boolean>;
  ended: Promise<HotkeyEnd>;
  stop: () => void;
};

const hotkeyWatcher = String.raw`
ObjC.import("CoreGraphics");
ObjC.import("Foundation");

function watchHotkey() {
  const source = $.kCGEventSourceStateCombinedSessionState;
  const modifierMask = 0x9e0000;
  const modifierKeys = new Set([54, 55, 56, 57, 58, 59, 60, 61, 62, 63]);
  const flags = () => Number($.CGEventSourceFlagsState(source)) & modifierMask;
  const down = (key) => Boolean($.CGEventSourceKeyState(source, key));
  const heldFlags = flags();
  const heldKeys = [];
  for (let key = 0; key < 128; key += 1) {
    if (!modifierKeys.has(key) && down(key)) heldKeys.push(key);
  }
  if (!heldFlags) return "not-held";
  console.log("raycast-hotkey-held");
  const started = Date.now();
  while (Date.now() - started < 300000) {
    if (!heldKeys.includes(53) && down(53)) return "canceled";
    if ((flags() & heldFlags) !== heldFlags) return "released";
    if (heldKeys.some((key) => !down(key))) return "released";
    $.NSThread.sleepForTimeInterval(0.01);
  }
  return "timeout";
}

watchHotkey();
`;

/** Starts watching the command's held shortcut. Escape cancels the recording. */
export function watchHotkey(signal?: AbortSignal): HotkeyWatch {
  const child = spawn(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", hotkeyWatcher],
    { shell: false, windowsHide: true },
  );
  let stdout = "";
  let stderr = "";
  let heldSettled = false;
  let resolveHeld: (held: boolean) => void;
  let rejectHeld: (error: Error) => void;
  const held = new Promise<boolean>((resolve, reject) => {
    resolveHeld = resolve;
    rejectHeld = reject;
  });
  const ended = new Promise<HotkeyEnd>((resolve, reject) => {
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (!heldSettled && stderr.includes("raycast-hotkey-held")) {
        heldSettled = true;
        resolveHeld(true);
      }
    });
    child.once("error", (error) => {
      if (!heldSettled) {
        heldSettled = true;
        rejectHeld(error);
      }
      reject(error);
    });
    child.once("close", (code) => {
      const result = stdout.trim();
      if (!heldSettled) {
        heldSettled = true;
        if (result === "not-held") resolveHeld(false);
        else
          rejectHeld(new Error("The Dictate hotkey could not be monitored."));
      }
      if (
        result === "released" ||
        result === "canceled" ||
        result === "timeout" ||
        result === "not-held"
      ) {
        resolve(result);
        return;
      }
      reject(
        new Error(
          `The Dictate hotkey could not be monitored${code === null ? "" : ` (${code})`}${stderr.trim() ? `: ${stderr.trim()}` : "."}`,
        ),
      );
    });
  });
  void held.catch(() => undefined);
  void ended.catch(() => undefined);
  const stop = () => child.kill("SIGTERM");
  if (signal) {
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop, { once: true });
  }
  return { held, ended, stop };
}

/** Preserves an active plain-text selection and appends the dictation after it. */
export function textForInsertion(text: string, selectedText?: string): string {
  if (!selectedText) return text;
  const space = /\s$/.test(selectedText) || /^[,.;:!?)]/.test(text) ? "" : " ";
  return `${selectedText}${space}${text}`;
}
