import { Grid, getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/types";

const preferences: Preferences = getPreferenceValues();
const gridSize: string = preferences.gridSize;
export const numRecent: number = preferences.numRecent;
export const previewSize = gridSize === "small" ? "2x" : "256";

export const getGridSize = (): Grid.ItemSize => (gridSize === "small" ? Grid.ItemSize.Small : Grid.ItemSize.Medium);
