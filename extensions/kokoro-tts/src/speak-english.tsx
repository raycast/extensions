import { getPreferenceValues } from "@raycast/api";
import { readInputText } from "./utils/input-text";
import { runSpeak } from "./utils/run-speak";

interface Preferences {
  voice: string;
  speed: string;
  pythonPath: string;
}

export default async function Command() {
  const text = await readInputText();
  if (text === null) return;

  const prefs = getPreferenceValues<Preferences>();
  const speed = parseFloat(prefs.speed) || 1.0;

  await runSpeak("English", text, prefs.voice, speed, prefs.pythonPath);
}
