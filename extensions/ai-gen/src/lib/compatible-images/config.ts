import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { providerSettings, requireProvider, modelKey } from "./provider-settings";

export function getProvider() {
  return providerSettings(getPreferenceValues<Preferences>());
}
export async function getSelectedModel(): Promise<string> {
  return (await LocalStorage.getItem<string>(modelKey(getProvider()))) || "";
}
export async function saveSelectedModel(model: string): Promise<void> {
  await LocalStorage.setItem(modelKey(getProvider()), model.trim());
}
export async function getConfig() {
  const provider = requireProvider(getProvider());
  const model = await getSelectedModel();
  if (!model) throw new Error("Open Generate or Edit Image, then choose Choose Default Model from the action menu.");
  return { ...provider, model };
}
