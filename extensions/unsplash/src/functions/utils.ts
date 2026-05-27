import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { join } from "path";
import { homedir } from "os";
import { apiRequest } from "@/functions/apiRequest";

export const getGridColumns = (): number => {
  const { gridItemSize } = getPreferenceValues<Preferences>();
  if (gridItemSize === "small") return 8;
  if (gridItemSize === "large") return 3;
  return 5;
};

export const showImageTitle = (): boolean => getPreferenceValues<Preferences>().showImageTitle;

export const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());

export const resolveHome = (filepath: string): string =>
  filepath.startsWith("~") ? join(homedir(), filepath.slice(1)) : filepath;

export const likeOrDislike = async (id: number, liked?: boolean) => {
  const toast = await showToast(Toast.Style.Animated, `${liked ? "Unliking" : "Liking"} photo...`);
  try {
    await apiRequest(`/photos/${id}/like`, { method: liked ? "DELETE" : "POST" });
    toast.style = Toast.Style.Success;
    toast.title = `Photo ${liked ? "unliked" : "liked"}!`;
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "An error occured";
  }
};
