import { getPreferenceValues } from "@raycast/api";
import fse from "fs-extra";
import { homedir } from "os";

const { downloadDirectory } = getPreferenceValues();

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const capitalizeFirstChar = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const getSavedDirectory = () => {
  const actualDirectory = downloadDirectory;
  if (isEmpty(actualDirectory) || !fse.pathExistsSync(actualDirectory)) {
    return homedir() + "/Downloads";
  }
  return actualDirectory.endsWith("/") ? actualDirectory.substring(0, -1) : actualDirectory;
};

// Function to format the ID for a valid filename
export const formatIdForFilename = (id: string) => {
  return id
    .replace(/[<>:"/\\|?*]+/g, "-") // Replace invalid characters with a dash
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/\.{2,}/g, ".") // Replace multiple dots with a single dot
    .replace(/^-+|-+$/g, "") // Trim dashes from the start and end
    .replace(/\.+$/, "") // Remove trailing dots
    .toLowerCase(); // Convert to lowercase
};

export const getFileExtension = (url: string) => {
  const urlParams = new URLSearchParams(url.split("?")[1]);
  const format = urlParams.get("fm");
  return format || "jpg"; // Default to 'jpg' if no format is specified
};
