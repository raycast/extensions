import { say } from "mac-say";
import { getParsedSaySettings } from "@/utils";

type Input = {
  /**
   * The voice to use. If not provided, the default voice will be used.
   */
  voice?: string;
  /**
   * The text to say
   */
  content: string;
};

/**
 * Use AI to say things out loud
 */
export default async function ({ content, voice }: Input) {
  const { keepSilentOnError, ...saySettings } = getParsedSaySettings();
  saySettings.voice = voice ?? saySettings.voice;
  try {
    await say(content, saySettings);
  } catch (error) {
    if (keepSilentOnError) return;
    await say(String(error), saySettings);
  }
}
