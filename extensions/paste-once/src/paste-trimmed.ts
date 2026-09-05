import { TextCleaner } from "./lib/text-cleaner";
import { pasteResult, readClipboardText } from "./lib/run-clipboard";
import { readPreferences, trimConfigFromPrefs } from "./lib/prefs";

export default async function Command() {
  const text = await readClipboardText();
  if (text === null) return;

  const result = new TextCleaner().transform(text, trimConfigFromPrefs(readPreferences()));
  await pasteResult(result.trimmed, result.wasTransformed ? "Pasted trimmed command" : "Nothing to trim");
}
