import { say } from "mac-say";
import { getParsedSaySettings } from "../utils.js";

type Input = {
  /**
   * The voice to use. Only fill this in if you need to override the default voice.
   * The voice must be a valid voice name. You can get the list of available voices with the `get-voices` tool.
   */
  voice?: string;
  /**
   * The rate to use. Only fill this in if you need to override the default rate (175 by default).
   * The rate can be a number between 50 and 300.
   */
  rate?: number;
  /**
   * The text to say
   */
  content: string;
};

/**
 * Use AI to say things out loud.
 *
 * When you need to override the default voice or rate, fill in the `voice` and `rate` arguments, otherwise it should use the default voice and rate that the user has configured in the extension settings.
 */
export default async function ({ content, voice, rate }: Input) {
  const { keepSilentOnError, ...saySettings } = getParsedSaySettings();
  saySettings.voice = voice && voice.length > 0 ? voice : saySettings.voice;
  saySettings.rate = rate && rate >= 50 && rate <= 300 ? rate : saySettings.rate;
  try {
    await say(content, saySettings);
  } catch (error) {
    if (keepSilentOnError) return;
    await say(String(error), saySettings);
  }
}
