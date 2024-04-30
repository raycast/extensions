import { getPreferenceValues } from "@raycast/api";
import { TextToSpeechProcessor } from "./processors/text-to-speech-processor";
import { Preferences } from "./preferences";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const processor = new TextToSpeechProcessor(preferences);
  await processor.processSelectedText();
}
