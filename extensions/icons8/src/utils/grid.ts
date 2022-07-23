import { Grid, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/types";

const preferences: Preferences = getPreferenceValues();

export const getGridItemSize = (): Grid.ItemSize => (
  preferences.gridSize === "small" ? Grid.ItemSize.Small : Grid.ItemSize.Medium
)