import { LocalStorage } from "@raycast/api";
import { DICTIONARY_ENTRIES_KEY } from "../dictate-dictionary";

interface DictionaryEntry {
  original: string;
  correction: string;
  addedAt: number;
}

/**
 * Get the personal dictionary entries as a formatted string for the AI prompt
 * @returns A string containing the dictionary entries in a format suitable for the AI prompt
 */
export async function getPersonalDictionaryPrompt(): Promise<string> {
  try {
    const savedEntries = await LocalStorage.getItem<string>(DICTIONARY_ENTRIES_KEY);
    if (!savedEntries) {
      return "";
    }

    const entries: DictionaryEntry[] = JSON.parse(savedEntries);
    if (entries.length === 0) {
      return "";
    }

    const formattedEntries = entries
      .map((entry) => `"${entry.original}" should be transcribed as "${entry.correction}"`)
      .join("\n");

    return `
Here is a list of personal dictionary entries to use for improving transcription accuracy:

${formattedEntries}

Please use these corrections when transcribing the text, but only when you are confident that the word or phrase matches exactly.
`;
  } catch (error) {
    console.error("Error getting dictionary entries:", error);
    return "";
  }
}
