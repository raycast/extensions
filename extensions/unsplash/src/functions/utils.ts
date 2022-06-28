import { Grid, getPreferenceValues } from "@raycast/api";

const preferences: any = getPreferenceValues();

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
