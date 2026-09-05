import { TextCleaner } from "./lib/text-cleaner";
import { copyResult, readClipboardText } from "./lib/run-clipboard";
import { readPreferences, trimConfigFromPrefs } from "./lib/prefs";

export default async function Command() {
  const text = await readClipboardText();
  if (text === null) return;

  const result = new TextCleaner().transform(text, trimConfigFromPrefs(readPreferences()));
  if (!result.wasTransformed) {
    await copyResult(result.trimmed, "Nothing to trim");
    return;
  }
  await copyResult(result.trimmed, "Copied trimmed command");
}
