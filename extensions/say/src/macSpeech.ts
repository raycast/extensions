import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { environment } from "@raycast/api";
import { getDeviceUID } from "swift:../swift";
import type { SayOptions } from "native-say";
import { getSystemSpeakingRate } from "./systemSpeech.js";

const execFileAsync = promisify(execFile);
const script = path.join(environment.assetsPath, "mac-speech.js");
const scriptHost = "/usr/bin/osascript";

export type MacVoice = {
  identifier: string;
  name: string;
  language: string;
  quality: "standard" | "enhanced" | "premium";
  legacyName?: string;
  isSiri: boolean;
  shortName: string;
};

// macOS filters Siri voices in independently compiled executables. Its own
// script host exposes the full AVFoundation catalog without a Swift toolchain.
export const getMacVoices = async (): Promise<MacVoice[]> => {
  const { stdout } = await execFileAsync(scriptHost, ["-l", "JavaScript", script, "--voices"], {
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout) as MacVoice[];
};

export const sayMacVoice = async (text: string, identifier: string, options: SayOptions) => {
  if (options.rate !== undefined && (!Number.isFinite(options.rate) || options.rate <= 0)) {
    throw new Error("Speaking rate must be positive.");
  }
  if (options.networkSend || options.channels !== undefined || options.quality !== undefined) {
    throw new Error("Siri and other AVFoundation voices do not support networkSend, channels, or quality options.");
  }
  const content = options.inputFile ? await readFile(options.inputFile, "utf8") : text;
  if (!content.trim()) return;
  // Resolve the live system rate here so previews, commands, and AI tools all
  // inherit it without depending on the configuration screen's cached data.
  const rate = options.rate ?? (await getSystemSpeakingRate());
  const audioDeviceUID = options.audioDevice ? await getDeviceUID(options.audioDevice) : undefined;
  if (options.audioDevice && !audioDeviceUID) throw new Error(`Audio device not found: ${options.audioDevice}`);
  const temporaryFile =
    options.audioDevice && !options.outputFile ? path.join(os.tmpdir(), `raycast-say-${randomUUID()}.caf`) : undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(scriptHost, ["-l", "JavaScript", script, "--speak"]);
      let stderr = "";
      child.stdout.resume();
      child.stderr.setEncoding("utf8").on("data", (data: string) => {
        stderr += data;
      });
      child.on("error", reject);
      child.on("close", (code, signal) => {
        if (code === 0 || signal === "SIGTERM" || signal === "SIGKILL") resolve();
        else reject(new Error(stderr.trim() || `Speech exited with code ${code}`));
      });
      child.stdin.on("error", () => {});
      child.stdin.end(
        JSON.stringify({
          text: content,
          identifier,
          rate,
          volume: options.volume,
          audioDeviceUID,
          outputFile: options.outputFile || undefined,
          temporaryFile,
        }),
      );
    });
  } finally {
    if (temporaryFile) await rm(temporaryFile, { force: true });
  }
};

// Each Raycast command runs independently, so an in-memory PID cannot support
// Stop Running Say or the playing state in another command.
export const getRunningMacSpeech = async () => {
  const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,command="], { maxBuffer: 16 * 1024 * 1024 });
  return stdout.split("\n").flatMap((line) => {
    const match = /^\s*(\d+)\s+(.+)$/.exec(line);
    if (!match || match[2] !== `${scriptHost} -l JavaScript ${script} --speak`) return [];
    return [{ platform: "darwin" as const, pid: Number(match[1]), name: "osascript", command: match[2] }];
  });
};

export const stopMacSpeech = async () => {
  for (const { pid } of await getRunningMacSpeech()) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
};
