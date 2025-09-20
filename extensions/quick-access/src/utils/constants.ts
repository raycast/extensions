import { Icon } from "@raycast/api";

export enum LocalStorageKey {
  LOCAL_PIN_DIRECTORY = "Local Pin",
}

export const DirectoryTagTypes = ["Image", "Folder", "File"];
export const DirectoryTags = [
  { title: "Image", icon: Icon.Image },
  { title: "Folder", icon: Icon.Folder },
  { title: "File", icon: Icon.Document },
];

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

export const ZIP_EXT = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso"];
export const NO_PREVIEW_EXTENSIONS = [".exe", ".DS_Store", ".gdoc", ".gsheet", ".gslides", ".ts", ".css"];
export const DMG_EXT = ".dmg";
export const APP_EXT = ".app";

export const IMAGE_PREVIEW_HEIGHT = 190;
