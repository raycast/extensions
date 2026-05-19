import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { getLanguageTitle, resolveTargetLanguage } from "./languages";
import { addHistoryEntry } from "./history-store";
import {
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getTimeoutMs,
  readPreferences,
} from "./preferences";
import { MissingAPIKeyError, translateWithProvider } from "./providers";
import { loadRuntimeSettings } from "./runtime-settings";
import { TranslationRequest } from "./types";

export default async function Command() {
  let source = "";
  try {
    source = (await getSelectedText()).replace(/\r\n/g, "\n").trim().slice(0, 12000);
  } catch {
    source = "";
  }

  if (!source) {
    await showHUD("No selected text — select text first, or grant Raycast Accessibility access in System Settings");
    return;
  }

  const preferences = readPreferences();
  const runtimeSettings = await loadRuntimeSettings();
  const providerId = getOrderedProviderIds(preferences)[0];
  const config = getProviderConfig(providerId, preferences, runtimeSettings.modelTier);
  const resolved = resolveTargetLanguage(preferences.targetLanguage, source);

  const request: TranslationRequest = {
    text: source,
    targetLanguage: resolved,
    targetLanguageTitle: getLanguageTitle(resolved),
    style: runtimeSettings.translationStyle,
    promptProfile: runtimeSettings.promptProfile,
    customPromptInstructions: runtimeSettings.customPromptInstructions || preferences.customPromptInstructions,
    timeoutMs: getTimeoutMs(preferences),
    maxOutputTokens: getMaxOutputTokens(preferences),
  };

  try {
    await showHUD(`Translating with ${config.title}...`);
    const translation = await translateWithProvider(config, request);
    await Clipboard.paste(translation);
    await addHistoryEntry({
      kind: "translate",
      source,
      output: translation,
      provider: config.title,
      model: config.model,
    });
    await showHUD("Translation pasted");
  } catch (error) {
    const message =
      error instanceof MissingAPIKeyError
        ? `${config.title}: add an API key in Extension Preferences`
        : error instanceof Error
          ? error.message
          : String(error);
    await showHUD(`Translate failed — ${message.slice(0, 100)}`);
  }
}
