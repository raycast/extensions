import { Application, open, showHUD } from "@raycast/api";
import { Preset } from "../types";

const countPluralizer = (items: Application[] | string[], singular: string, plural: string) => {
  return items.length === 1 ? `${singular}` : `${plural}`;
};

export const executePreset = async (preset: Preset) => {
  await Promise.all([...preset.apps.map(async (app) => open(app.path))]);
  // Open URLs sequentially with 500ms delay between each.
  // This ensures that all URLs are opened before moving to the next one.
  for (const url of preset.urls) {
    await open(url);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  showHUD(
    `${preset.apps.length} ${countPluralizer(preset.apps, "App", "Apps")}, ${preset.urls.length} ${countPluralizer(
      preset.urls,
      "URL",
      "URLs"
    )} Launched via Preset: ${preset.name}`
  );
};
