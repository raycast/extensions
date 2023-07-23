import { getPreferenceValues } from "@raycast/api";
import { execaSync } from "execa";

const preferences = getPreferenceValues<Preferences>();

const TEMP_DIRECTORY = "/tmp/raycast-upload-to-cloudinary";

export function storeClipboardToTemp() {
  if (typeof preferences.pngpasteFullPath !== "string") {
    throw new Error("Missing pngpasteFullPath configuration.");
  }

  const { failed } = execaSync(preferences.pngpasteFullPath, [TEMP_DIRECTORY]);

  if (failed) {
    throw new Error(`Failed to store clipboard to temporary path ${TEMP_DIRECTORY}`);
  }

  return TEMP_DIRECTORY;
}
