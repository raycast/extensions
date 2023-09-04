import { LocalStorage } from "@raycast/api";
import type { RecordingOptions, RecordingPreferences, Recording } from "~/types/recording";
import { STORAGE_KEY } from "~/constants/storage";
import { DEFAULT_RECORDING_OPTIONS } from "~/constants/recording";

export async function clearStoredRecording() {
  await LocalStorage.removeItem(STORAGE_KEY.RECORDING_DATA);
}

export async function getStoredRecording(): Promise<Recording | undefined> {
  try {
    const serializedRecording = await LocalStorage.getItem<string>(STORAGE_KEY.RECORDING_DATA);
    const recording = JSON.parse<Recording>(serializedRecording ?? "null");

    return { ...recording, startTime: new Date(recording.startTime) };
  } catch (error) {
    return undefined;
  }
}

export async function saveRecordingData(recording: Recording) {
  await LocalStorage.setItem(STORAGE_KEY.RECORDING_DATA, JSON.stringify(recording));
}

export async function saveRecordingPreferences(value: RecordingOptions) {
  await LocalStorage.setItem(STORAGE_KEY.RECORDING_PREFERENCES, JSON.stringify(value));
}

export async function getStoredRecordingPreferences(): Promise<RecordingPreferences> {
  try {
    const serializedPreferences = await LocalStorage.getItem<string>(STORAGE_KEY.RECORDING_PREFERENCES);
    if (!serializedPreferences) return DEFAULT_RECORDING_OPTIONS;
    return { ...DEFAULT_RECORDING_OPTIONS, ...JSON.parse<RecordingOptions>(serializedPreferences) };
  } catch {
    return DEFAULT_RECORDING_OPTIONS;
  }
}
