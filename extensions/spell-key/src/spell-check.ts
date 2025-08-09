import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { environment } from "@raycast/api";

const MAX_WORD_LENGTH = "pneumonoultramicroscopicsilicovolcanoconiosis".length;

const execAsync = promisify(exec);

export async function getSpellingSuggestions(word: string): Promise<string[]> {
  const trimmedWord = word.trim();

  if (!trimmedWord || trimmedWord.length === 0 || trimmedWord.length > MAX_WORD_LENGTH) {
    return [];
  }

  const binaryPath = join(environment.assetsPath, "spellcheck-native");

  try {
    const { stdout } = await execAsync(`"${binaryPath}" ${JSON.stringify(trimmedWord)}`);
    const suggestions = stdout.trim().split(/,\s*/).filter(Boolean);
    return suggestions;
  } catch (error) {
    console.error("Spellcheck failed:", error);
    return [];
  }
}
