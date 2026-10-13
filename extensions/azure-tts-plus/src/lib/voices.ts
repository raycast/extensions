import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AzureCredentials } from "./settings.js";
import { powershell } from "./synth.js";

const execFileAsync = promisify(execFile);

export type VoiceOption = {
  /** The value stored in settings. */
  id: string;
  /** What the dropdown shows. */
  title: string;
  /** Dropdown section, e.g. "Portuguese (Brazil)". */
  group: string;
};

type AzureVoice = {
  Name: string;
  ShortName: string;
  LocalName: string;
  Locale: string;
  Gender: string;
  VoiceType: string;
};

const localeName = (locale: string) => {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        locale.split("-")[1] ?? "",
      ) ?? locale
    );
  } catch {
    return locale;
  }
};

const languageName = (locale: string) => {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "language" }).of(
        locale.split("-")[0],
      ) ?? locale
    );
  } catch {
    return locale;
  }
};

export const listAzureVoices = async ({
  key,
  region,
}: AzureCredentials): Promise<VoiceOption[]> => {
  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
    {
      headers: { "Ocp-Apim-Subscription-Key": key },
    },
  );
  if (!response.ok) {
    throw new Error(
      `Azure answered ${response.status} ${response.statusText}. Check the key and the region.`,
    );
  }
  const voices = (await response.json()) as AzureVoice[];
  return voices
    .map((voice) => ({
      id: voice.ShortName,
      title: `${voice.LocalName} · ${voice.Gender}${voice.VoiceType === "Neural" ? "" : ` · ${voice.VoiceType}`}`,
      group: `${languageName(voice.Locale)} (${localeName(voice.Locale)})`,
    }))
    .sort(
      (a, b) =>
        a.group.localeCompare(b.group) || a.title.localeCompare(b.title),
    );
};

export const listWindowsVoices = async (): Promise<VoiceOption[]> => {
  const script =
    "Add-Type -AssemblyName System.Speech; " +
    "$v = (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | " +
    "Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Culture.Name }; " +
    '[Console]::Out.Write(($v -join "`n"))';
  const { stdout } = await execFileAsync(
    powershell,
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ],
    { windowsHide: true },
  );
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, culture = ""] = line.split("|");
      return {
        id: name,
        title: name.replace(/^Microsoft\s+/i, "").replace(/\s+Desktop$/i, ""),
        group: culture
          ? `${languageName(culture)} (${localeName(culture)})`
          : "Installed",
      };
    })
    .sort(
      (a, b) =>
        a.group.localeCompare(b.group) || a.title.localeCompare(b.title),
    );
};
