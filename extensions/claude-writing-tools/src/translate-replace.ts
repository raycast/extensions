import { AUTO, languageTitle } from "./lib/languages";
import { TRANSLATION_SCHEMA, translateSelectionSystem } from "./lib/prompts";
import { runQuickTask } from "./lib/quick";
import { settings } from "./lib/settings";

/** No arguments on purpose: a hotkey runs it at once, without opening Raycast. */
export default async function Command() {
  await runQuickTask<{ language: string; text: string }>({
    command: "translate-replace",
    title: "Translate and Replace",
    progress: "Translating…",
    system: translateSelectionSystem(AUTO, settings().langs),
    schema: TRANSLATION_SCHEMA,
    done: (data) => `✓ Translated to ${languageTitle(data.language)}`,
  });
}
