import { closeMainWindow, showHUD, getPreferenceValues } from "@raycast/api";
import { count } from "./lib/count";
import { readFromScreenshot } from "./utils";

interface Preferences {
  playSound?: boolean;
  ocrLanguage?: string;
  showStatCharacters?: boolean;
  showStatWords?: boolean;
  showStatSentences?: boolean;
  showStatParagraphs?: boolean;
  showStatReadingTime?: boolean;
  showStatSpeakingTime?: boolean;
}

export default async function Command() {
  await closeMainWindow();

  try {
    const preferences = getPreferenceValues<Preferences>();
    const text = await readFromScreenshot(preferences.playSound ?? false, preferences.ocrLanguage ?? "en");

    if (!text) {
      await showHUD("❌ Nothing to count!");
      return;
    }

    const result = count(text, true);

    const isEnabled = (value: boolean | undefined, defaultValue: boolean) => value ?? defaultValue;
    const number = (value: number) => value.toLocaleString();
    const plural = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

    const statConfigs = [
      {
        key: "showStatCharacters" as const,
        value: result.characters,
        label: "char",
        labelPlural: "chars",
        defaultEnabled: true,
      },
      { key: "showStatWords" as const, value: result.words, label: "word", labelPlural: "words", defaultEnabled: true },
      {
        key: "showStatSentences" as const,
        value: result.sentences,
        label: "sentence",
        labelPlural: "sentences",
        defaultEnabled: true,
      },
      {
        key: "showStatParagraphs" as const,
        value: result.paragraphs,
        label: "paragraph",
        labelPlural: "paragraphs",
        defaultEnabled: false,
      },
      {
        key: "showStatReadingTime" as const,
        value: result.reading_time,
        label: "min to read",
        labelPlural: "mins to read",
        defaultEnabled: false,
      },
      {
        key: "showStatSpeakingTime" as const,
        value: result.speaking_time,
        label: "min to speak",
        labelPlural: "mins to speak",
        defaultEnabled: false,
      },
    ];

    const stats = statConfigs
      .filter((config) => isEnabled(preferences[config.key], config.defaultEnabled))
      .map((config) => `${number(config.value)} ${plural(config.value, config.label, config.labelPlural)}`);

    const fallbackHudMessage = `📊 ${number(result.characters)} chars · ${number(result.words)} words · ${number(result.sentences)} sentences`;
    const hudMessage = stats.length ? `📊 ${stats.join(" · ")}` : fallbackHudMessage;

    await showHUD(hudMessage);
  } catch (error) {
    console.error("Screenshot count error:", error);
    await showHUD("❌ Nothing to count!");
  }
}
