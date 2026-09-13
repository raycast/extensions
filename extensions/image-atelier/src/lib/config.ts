import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { Config, endpoint } from "./images";
export function getProvider() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    ...preferences,
    outputDirectory:
      preferences.outputDirectory ||
      join(homedir(), "Pictures", "Image Atelier"),
  };
}
function modelKey() {
  const p = getProvider();
  return (
    "model-" +
    createHash("sha256")
      .update(endpoint(p.baseUrl, false) + "\n" + p.apiKey.trim())
      .digest("hex")
  );
}
export async function getSelectedModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(modelKey())) || "";
}
export async function saveSelectedModel(model: string): Promise<void> {
  await LocalStorage.setItem(modelKey(), model.trim());
}
export async function getConfig(): Promise<Config> {
  const model = await getSelectedModel();
  if (!model)
    throw new Error(
      "Open Generate or Edit Image, then choose Choose Default Model from the action menu.",
    );
  return { ...getProvider(), model };
}
