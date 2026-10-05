import { showHUD, LaunchProps, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { addEntry, getLanguages } from "./data/data";

export default async function main(props: LaunchProps<{ arguments: Arguments.QuickAdd }>) {
  const { word, translation, language } = props.arguments;
  const preferences = getPreferenceValues<Preferences.QuickAdd>();
  const languageAbbreviation = language || preferences.defaultLanguage;

  try {
    if (word.trim() === "") {
      throw new Error("Word cannot be empty.");
    }

    if (translation.trim() === "") {
      throw new Error("Translation cannot be empty.");
    }

    if (!languageAbbreviation) {
      throw new Error("Please enter a language or set a default language in preferences.");
    }

    const languages = getLanguages();
    const languageEntry = languages.find(
      (l) =>
        l.abbreviation?.toLowerCase() === languageAbbreviation.toLowerCase() ||
        l.name.toLowerCase() === languageAbbreviation.toLowerCase(),
    );

    if (!languageEntry && !language)
      throw new Error(
        `Language "${languageAbbreviation}" not found. Please check your input or set a valid default language in preferences.`,
      );

    if (!languageEntry) throw new Error(`Language "${languageAbbreviation}" not found.`);

    const languageId = languageEntry.id;

    addEntry(word, translation, languageId);

    await showHUD("✅ Word successfully added!");
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
  }
}
