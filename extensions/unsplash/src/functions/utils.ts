import { Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { join } from "path";
import { homedir } from "os";
import { apiRequest } from "@/functions/apiRequest";

const preferences = getPreferenceValues<Preferences>();

export const getGridItemSize = (): Grid.ItemSize => {
  const { gridItemSize } = preferences;

  if (gridItemSize == "small") return Grid.ItemSize.Small;
  else if (gridItemSize == "large") return Grid.ItemSize.Large;
  else return Grid.ItemSize.Medium;
};

export const showImageTitle = (): boolean => {
  return preferences.showImageTitle;
};

export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (text: string) => {
    return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
  });
};

export const resolveHome = (filepath: string) => {
  if (filepath[0] === "~") {
    return join(homedir(), filepath.slice(1));
  }
  return filepath;
};

export const likeOrDislike = async (id: number, liked?: boolean) => {
  const toast = await showToast(Toast.Style.Animated, "Liking photo...");

  try {
    await apiRequest(`/photos/${id}/like`, {
      method: liked ? "DELETE" : "POST",
    });

    toast.style = Toast.Style.Success;
    toast.title = `Photo ${liked ? "unliked" : "liked"}!`;
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "An error occured";
  }
};
