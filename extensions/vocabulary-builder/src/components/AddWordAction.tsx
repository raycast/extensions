import { Action, Icon, showToast, Toast } from "@raycast/api";
import { Language } from "../data/types";
import { addEntry } from "../data/data";

type ParsedSubmission = {
  word: string;
  translation: string;
  languageAbbreviation?: string;
};

export function AddWordAction({
  submission: submission,
  selectedLanguageId,
  onRefresh,
  languages,
}: {
  submission: string;
  selectedLanguageId?: string;
  onRefresh?: () => void;
  languages: Language[];
}) {
  function parseSubmission(input: string): ParsedSubmission {
    // Expected format: "word - translation" or "word - translation #lang"
    const match = input.match(/^(.+?)(\s+-\s*|\s*-\s+)(.+?)(?:\s+#(\w+))?$/);
    if (!match) throw new Error('Invalid format. Use: "word - translation" or "word - translation #lang"');

    return {
      word: match[1].trim(),
      translation: match[3].trim(),
      languageAbbreviation: match[4],
    };
  }

  async function handleSubmit() {
    try {
      const { word, translation, languageAbbreviation } = parseSubmission(submission);

      let languageId = selectedLanguageId;

      if (word.trim() === "") {
        throw new Error("Word cannot be empty.");
      }

      if (translation.trim() === "") {
        throw new Error("Translation cannot be empty.");
      }

      if (languageAbbreviation) {
        const language = languages.find((l) => l.abbreviation?.toLowerCase() === languageAbbreviation.toLowerCase());
        if (!language) throw new Error(`Language "${languageAbbreviation}" not found.`);
        languageId = language.id;
      }

      if (!languageId) throw new Error("No language specified.");

      addEntry(word, translation, languageId);
      onRefresh?.();
      await showToast({ style: Toast.Style.Success, title: `"${word}" added` });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
    }
  }

  return <Action title="Add Word" icon={Icon.PlusSquare} onAction={handleSubmit} />;
}
