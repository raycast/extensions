import { execFile } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import * as winSay from "@litomore/win-say";
import * as macSay from "mac-say";
import { maxRate, minRate } from "./constants.js";

type MacSayOptions = macSay.SayOptions;
type WinSayOptions = winSay.SayOptions;
type WinVoice = winSay.Voice;

export type SayOptions = MacSayOptions & WinSayOptions;

export type Voice = {
  name: string;
  languageCode: string;
  example: string;
  description?: string;
  gender?: string;
  age?: string;
  enabled?: boolean;
};

export type Device = {
  id: string;
  name: string;
};

export const isMacOS = process.platform === "darwin";
export const isWindows = process.platform === "win32";
export const supportsAudioDeviceSelection = isMacOS;

const windowsMinRate = -10;
const windowsMaxRate = 10;
const execFileAsync = promisify(execFile);
const powershellArguments = ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"];

const runPowerShell = async (command: string) =>
  execFileAsync("powershell.exe", [...powershellArguments, command], { encoding: "utf8" });

const toWindowsRate = (rate?: number) => {
  if (rate === undefined) return undefined;
  if (rate >= windowsMinRate && rate <= windowsMaxRate) return rate;

  const clampedRate = Math.min(maxRate, Math.max(minRate, rate));
  const scale = (windowsMaxRate - windowsMinRate) / (maxRate - minRate);
  return Math.round((clampedRate - minRate) * scale + windowsMinRate);
};

const toWindowsSayOptions = (options: SayOptions = {}): WinSayOptions => ({
  voice: options.voice,
  rate: toWindowsRate(options.rate),
  volume: options.volume,
  outputFile: options.outputFile,
  skipRunningCheck: options.skipRunningCheck,
});

const toMacSayOptions = (options: SayOptions = {}): MacSayOptions => ({
  voice: options.voice,
  rate: options.rate,
  audioDevice: options.audioDevice,
  quality: options.quality,
  inputFile: options.inputFile,
  outputFile: options.outputFile,
  networkSend: options.networkSend,
  channels: options.channels,
  skipRunningCheck: options.skipRunningCheck,
});

const normalizeWindowsLanguageCode = (culture: string) => culture.replaceAll("-", "_");

const getWindowsVoiceExampleName = (voiceName: string) =>
  voiceName.replace(/^Microsoft\s+/i, "").replace(/\s+Desktop$/i, "");

const normalizeWindowsVoice = (voice: WinVoice): Voice => ({
  name: voice.name,
  languageCode: normalizeWindowsLanguageCode(voice.culture),
  example: `Hello! My name is ${getWindowsVoiceExampleName(voice.name)}.`,
  description: voice.description,
  gender: voice.gender,
  age: voice.age,
  enabled: voice.enabled,
});

const getWindowsSayProcessIds = async () => {
  try {
    const { stdout } = await runPowerShell(`
$marker = 'WIN_' + 'SAY_' + 'TTS_' + 'PROCESS'
$processes = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -like "*$marker*"
} | Select-Object -ExpandProperty ProcessId
$processes | ConvertTo-Json -Compress
`);
    const output = stdout.trim();
    if (!output || output === "null") return [];

    const parsedOutput: unknown = JSON.parse(output);
    const processIds = Array.isArray(parsedOutput) ? parsedOutput : [parsedOutput];
    return processIds.filter((processId): processId is number => typeof processId === "number");
  } catch {
    return [];
  }
};

const checkIfWindowsSayIsRunning = async () => {
  try {
    const runningSay = await winSay.checkIfSayIsRunning();
    if (runningSay) return runningSay;
  } catch {
    // Continue with the process marker fallback below.
  }

  const [processId] = await getWindowsSayProcessIds();
  if (!processId) return undefined;

  return {
    imageName: "powershell.exe",
    pid: processId,
  };
};

const killWindowsRunningSay = async () => {
  try {
    await winSay.killRunningSay();
  } catch {
    // Continue with the process marker fallback below.
  }

  try {
    await runPowerShell(`
$marker = 'WIN_' + 'SAY_' + 'TTS_' + 'PROCESS'
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -like "*$marker*"
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
`);
  } catch {
    // Stop commands should be best-effort.
  }
};

export const say = async (text: string, options?: SayOptions) => {
  if (isWindows) {
    if (!options?.skipRunningCheck) {
      await killWindowsRunningSay();
    }

    await winSay.say(text, { ...toWindowsSayOptions(options), skipRunningCheck: true });
    return;
  }

  await macSay.say(text, toMacSayOptions(options));
};

export const getVoices = async (): Promise<Voice[]> => {
  if (isWindows) {
    const voices = await winSay.getVoices();
    return voices.map((voice) => normalizeWindowsVoice(voice));
  }

  return macSay.getVoices();
};

export const getAudioDevices = async (): Promise<Device[]> => {
  if (isWindows) return winSay.getAudioDevices();
  return macSay.getAudioDevices();
};

export const checkIfSayIsRunning = async () => {
  if (isWindows) return checkIfWindowsSayIsRunning();
  return macSay.checkIfSayIsRunning();
};

export const killRunningSay = async () => {
  if (isWindows) {
    await killWindowsRunningSay();
    return;
  }

  await macSay.killRunningSay();
};
