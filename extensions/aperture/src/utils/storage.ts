import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY } from "~/constants/storage";
import { Recording } from "~/types/recording";

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
