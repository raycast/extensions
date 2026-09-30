import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";

const { domain } = getPreferenceValues<Preferences>();
export const SM_MS_BASE_URL = `https://${domain}/api/v2`;
export const SM_MS_URL = `https://${domain}`;

export const imgExt = [
  ".cr2",
  ".cr3",
  ".gif",
  ".gif",
  ".heic",
  ".heif",
  ".icns",
  ".icon",
  ".icons",
  ".jpeg",
  ".jpg",
  ".jpg",
  ".png",
  ".raf",
  ".raw",
  ".svg",
  ".tiff",
  ".webp",
];
