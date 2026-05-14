import { LocalStorage } from "@raycast/api";
import { DEFAULT_LAYOUTS } from "./defaults";
import { LayoutPreset } from "./types";

const STORAGE_KEY = "mactile-layout-presets";

export async function getLayouts(): Promise<LayoutPreset[]> {
  const rawValue = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_LAYOUTS;
  }

  try {
    const savedLayouts = JSON.parse(rawValue) as LayoutPreset[];
    const savedById = new Map(savedLayouts.map((layout) => [layout.id, layout]));
    const builtInLayouts = DEFAULT_LAYOUTS.map((layout) => mergeDefaultLayout(layout, savedById.get(layout.id)));
    const customLayouts = savedLayouts
      .filter((layout) => !DEFAULT_LAYOUTS.some((defaultLayout) => defaultLayout.id === layout.id))
      .map(normalizeLayout);

    return [...builtInLayouts, ...customLayouts.sort((first, second) => first.name.localeCompare(second.name))];
  } catch {
    return DEFAULT_LAYOUTS;
  }
}

export async function saveLayouts(layouts: LayoutPreset[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

export async function upsertLayout(layout: LayoutPreset) {
  const layouts = await getLayouts();
  const nextLayouts = layouts.filter((item) => item.id !== layout.id);
  nextLayouts.push(layout);
  await saveLayouts(nextLayouts);
}

export async function getLayout(id: string) {
  const layouts = await getLayouts();
  return layouts.find((layout) => layout.id === id);
}

export async function deleteLayout(id: string) {
  const layouts = await getLayouts();
  await saveLayouts(layouts.filter((layout) => layout.id !== id));
}

export function findLayoutByName(layouts: LayoutPreset[], name: string) {
  const normalizedName = name.trim().toLocaleLowerCase();
  return layouts.find((layout) => layout.name.toLocaleLowerCase() === normalizedName);
}

function mergeDefaultLayout(defaultLayout: LayoutPreset, savedLayout?: LayoutPreset): LayoutPreset {
  if (!savedLayout) {
    return defaultLayout;
  }

  const shouldUseRenamedPreset =
    savedLayout.name === "Custom Layout 1" ||
    savedLayout.name === "Custom Layout 2" ||
    savedLayout.name === "Custom Layout 3" ||
    savedLayout.name === "Fill" ||
    savedLayout.name === "Almost Maximize" ||
    savedLayout.name === "Large" ||
    savedLayout.name === "Medium" ||
    savedLayout.name === "Small" ||
    savedLayout.name === "Layout Preset 1" ||
    savedLayout.name === "Layout Preset 2" ||
    savedLayout.name === "Layout Preset 3";

  return {
    ...defaultLayout,
    ...normalizeLayout(savedLayout),
    name: shouldUseRenamedPreset ? defaultLayout.name : savedLayout.name,
    commandName: defaultLayout.commandName,
    isBuiltIn: true,
    isDisabledByDefault: defaultLayout.isDisabledByDefault,
  };
}

function normalizeLayout(layout: LayoutPreset): LayoutPreset {
  return {
    ...layout,
    placement: layout.placement ?? "center",
  };
}
