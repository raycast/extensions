import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY } from "~/constants/storage";
import { RecordingResult } from "~/utils/useAperture";

export async function clearStoredRecording() {
  await Promise.all([
    LocalStorage.removeItem(STORAGE_KEY.REC_PROCESS_ID),
    LocalStorage.removeItem(STORAGE_KEY.REC_FILE_PATH),
    LocalStorage.removeItem(STORAGE_KEY.REC_START_TIME),
  ]);
}
export async function getStoredRecording() {
  const pid = Number(await LocalStorage.getItem<string>(STORAGE_KEY.REC_PROCESS_ID));
  const filePath = await LocalStorage.getItem<string>(STORAGE_KEY.REC_FILE_PATH);
  const startTime = await LocalStorage.getItem<string>(STORAGE_KEY.REC_START_TIME);
  console.log({ pid, filePath, startTime })

  return { pid, filePath, startTime: startTime ? new Date(startTime) : undefined };
}

export async function saveRecordingData(recording: RecordingResult) {
  await Promise.all([
    LocalStorage.setItem(STORAGE_KEY.REC_PROCESS_ID, recording.pid),
    LocalStorage.setItem(STORAGE_KEY.REC_FILE_PATH, recording.filePath),
    LocalStorage.setItem(STORAGE_KEY.REC_START_TIME, recording.startTime.toISOString()),
  ]);
}