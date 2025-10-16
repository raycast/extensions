import os from "os";
import path from "path";
import { LocalStorage } from "@raycast/api";
import type { FormValues } from "../types";
const SETTINGS_KEY = "video-converter-settings";

export const defaultSettings: FormValues = {
  videoFormat: "mp4",
  videoCodec: "h264",
  compressionMode: "bitrate",
  preset: "medium",
  bitrate: "12000",
  maxSize: "100",
  audioBitrate: "128",
  outputFolder: [path.join(os.homedir(), "Downloads")],
  rename: "",
  subfolderName: "",
  useHardwareAcceleration: false,
  deleteOriginalFiles: false,
  videoFiles: [],
  audioFiles: [],
};

export async function loadSettings(): Promise<FormValues> {
  const stored = await LocalStorage.getItem<string>(SETTINGS_KEY);
  const parsed = stored
    ? (() => {
        try {
          return JSON.parse(stored);
        } catch {
          return {};
        }
      })()
    : {};
  return { ...defaultSettings, ...parsed };
}

export async function saveSettings(values: Partial<FormValues>): Promise<void> {
  const current = await loadSettings();
  const merged = { ...current, ...values };
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
}
