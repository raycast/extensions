import { getSelectedText, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import type { Fetch } from "../core/chat-client";
import { InvalidSettingsError } from "../core/errors";
import { applyModelChoices } from "../core/models";
import { confirmationMessage } from "../core/output";
import { describeTarget } from "../core/target";
import { TONES } from "../core/tones";
import { translate } from "../core/translate";
import { showTranslationError } from "./feedback";
import { deliverTranslation } from "./output";
import { loadSettings, type Settings } from "./settings";
import { localStore } from "./storage";

export async function translateSelectionInPlace(fetchFn: Fetch = fetch): Promise<void> {
  const text = await getSelectedText().then(
    (selection) => selection.trim(),
    () => "",
  );
  if (text === "") {
    await launchCommand({ name: "translate", type: LaunchType.UserInitiated });
    return;
  }

  let settings: Settings;
  try {
    settings = await loadSettings();
  } catch (error) {
    if (!(error instanceof InvalidSettingsError)) {
      throw error;
    }
    await showTranslationError(error, {
      command: "translate-selection",
      tone: "default",
      targetLanguage: "Not configured",
      textLength: text.length,
      providers: [],
    });
    return;
  }
  const { defaultTone: tone, target } = settings;
  const providers = await applyModelChoices(localStore, settings.providers);
  await showToast({
    style: Toast.Style.Animated,
    title: "Translating…",
    message: `${TONES[tone].title} · ${describeTarget(target)}`,
  });

  try {
    const result = await translate(
      { text, tone, target },
      { providers, store: localStore, fetch: fetchFn },
    );
    await deliverTranslation(
      "replace",
      result.text,
      confirmationMessage("replace", { providerId: result.provider.id, skipped: result.skipped }),
    );
  } catch (error) {
    await showTranslationError(
      error,
      {
        command: "translate-selection",
        tone,
        targetLanguage: describeTarget(target),
        textLength: text.length,
        providers,
      },
      () => void translateSelectionInPlace(fetchFn),
    );
  }
}
