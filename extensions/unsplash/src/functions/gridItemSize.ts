import { Grid, getPreferenceValues } from "@raycast/api";

const preferences: any = getPreferenceValues();

export const getGridItemSize = (): Grid.ItemSize => {
  return preferences.gridItemSize === "small"
    ? Grid.ItemSize.Small
    : preferences.gridItemSize === "large"
    ? Grid.ItemSize.Large
    : Grid.ItemSize.Medium;
};

export const showImageTitle = (): boolean => {
  return preferences.showImageTitle;
};
