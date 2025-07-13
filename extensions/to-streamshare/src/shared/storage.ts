import { LocalStorage } from "@raycast/api";

export interface UploadRecord {
  sourceFileName: string;
  downloadUrl: string;
  deletionUrl: string;
  timestamp: number;
}

export async function saveUploadRecord(record: UploadRecord) {
  const history = await getUploadHistory();
  history.unshift(record);
  await LocalStorage.setItem("upload-history", JSON.stringify(history));
}

export async function getUploadHistory(): Promise<UploadRecord[]> {
  const historyStr = await LocalStorage.getItem("upload-history");
  return historyStr ? JSON.parse(historyStr as string) : [];
}

export async function removeUploadRecord(downloadUrl: string) {
  const history = await getUploadHistory();
  const updatedHistory = history.filter((record) => record.downloadUrl !== downloadUrl);
  await LocalStorage.setItem("upload-history", JSON.stringify(updatedHistory));
}

export async function clearUploadHistory() {
  await LocalStorage.setItem("upload-history", JSON.stringify([]));
}
