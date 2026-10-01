import { Clipboard, getPreferenceValues, getSelectedText, LocalStorage, showHUD } from "@raycast/api";
import { discoverModels } from "./models";
import { DEFAULT_SYSTEM_PROMPT, refineText } from "./refine";
import { restoreSettings, settingsKey } from "./saved-settings";

export default async function Command() {
  try {
    const original = await getSelectedText().catch(() => {
      throw new Error("Select text in another app, then press your Refine shortcut.");
    });
    if (!original.trim()) throw new Error("Select some text, then press your Refine shortcut.");
    await showHUD("Loading Refine settings…");
    const configuration = getPreferenceValues<Preferences>();
    const [models, stored, prompt] = await Promise.all([
      discoverModels(configuration),
      LocalStorage.getItem<string>(settingsKey(configuration.baseUrl)),
      LocalStorage.getItem<string>("system-prompt"),
    ]);
    const settings = restoreSettings(models, stored, true);
    await showHUD("Refining selected text…");
    const refined = await refineText(original, {
      ...configuration,
      ...settings,
      systemPrompt: prompt ?? DEFAULT_SYSTEM_PROMPT,
    });
    if ((await getSelectedText().catch(() => "")) !== original)
      throw new Error("Selection changed. Select the text and try again.");
    await Clipboard.paste(refined);
    await showHUD("Text refined");
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "Could not refine the selected text.");
  }
}
