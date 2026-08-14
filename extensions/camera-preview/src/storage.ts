import { LocalStorage } from "@raycast/api";

/// The unique ID of the camera picked with the "Select Default Camera" command.
const DEFAULT_CAMERA_KEY = "default-camera-id";

export async function getDefaultCameraId(): Promise<string> {
  return (await LocalStorage.getItem<string>(DEFAULT_CAMERA_KEY)) ?? "";
}

export async function setDefaultCameraId(id: string | undefined): Promise<void> {
  if (id) {
    await LocalStorage.setItem(DEFAULT_CAMERA_KEY, id);
  } else {
    await LocalStorage.removeItem(DEFAULT_CAMERA_KEY);
  }
}
