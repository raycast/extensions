import { say } from "mac-say";
import { getParsedSaySettings } from "@/utils";

type Input = {
  /**
   * The voice to use. If not provided, the default voice will be used.
   */
  voice?: string;
  /**
   * The rate to use. If not provided, the default rate will be used.
   * The rate is a number between 50 and 300. The default rate is 175.
   */
  rate?: number;
  /**
   * The text to say
   */
  content: string;
};

/**
 * Use AI to say things out loud
 */
export default async function ({ content, voice, rate }: Input) {
  const { keepSilentOnError, ...saySettings } = getParsedSaySettings();
  saySettings.voice = voice ?? saySettings.voice;
  saySettings.rate = rate ?? saySettings.rate;
  try {
    await say(content, saySettings);
  } catch (error) {
    if (keepSilentOnError) return;
    await say(String(error), saySettings);
  }
}
