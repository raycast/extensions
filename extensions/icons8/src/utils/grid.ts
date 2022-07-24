import { Grid, getPreferenceValues } from "@raycast/api";
import { Preferences, Icon8 } from "../types/types";

const preferences: Preferences = getPreferenceValues();
const gridSize: string = preferences.gridSize;

export const getGridSize = (): Grid.ItemSize => (gridSize === "small" ? Grid.ItemSize.Small : Grid.ItemSize.Medium);
