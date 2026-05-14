import { LayoutPreset } from "./types";

export const DEFAULT_LAYOUTS: LayoutPreset[] = [
  createDefaultLayout("fill", "Almost Maximize", 96, 92, "fill"),
  createDefaultLayout("large", "Large", 82, 86, "large"),
  createDefaultLayout("medium", "Medium", 68, 78, "medium"),
  createDefaultLayout("small", "Small", 52, 66, "small"),
  createDefaultLayout("custom-1", "Layout Preset 1", 72, 82, "custom-1", true),
  createDefaultLayout("custom-2", "Layout Preset 2", 60, 74, "custom-2", true),
  createDefaultLayout("custom-3", "Layout Preset 3", 48, 64, "custom-3", true),
];

export function getDefaultLayout(id: string) {
  return DEFAULT_LAYOUTS.find((layout) => layout.id === id);
}

function createDefaultLayout(
  id: string,
  name: string,
  widthPercentage: number,
  heightPercentage: number,
  commandName: string,
  isDisabledByDefault = false,
): LayoutPreset {
  return {
    id,
    name,
    widthPercentage,
    heightPercentage,
    placement: "center",
    commandName,
    isBuiltIn: true,
    isDisabledByDefault,
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  };
}
