import { LaunchProps } from "@raycast/api";
import { languageTitle } from "./lib/languages";
import { TRANSLATION_SCHEMA, translateSelectionSystem } from "./lib/prompts";
import { runQuickTask } from "./lib/quick";
import { settings } from "./lib/settings";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TranslateTo }>) {
  const target = props.arguments.target;
  await runQuickTask<{ language: string; text: string }>({
    command: "translate-to",
    title: `Translate to ${languageTitle(target)}`,
    progress: `Translating to ${languageTitle(target)}…`,
    system: translateSelectionSystem(target, settings().langs),
    schema: TRANSLATION_SCHEMA,
    done: (data) => `✓ Translated to ${languageTitle(data.language)}`,
  });
}
