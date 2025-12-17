import { say } from "mac-say";
import { getParsedSaySettings } from "@/utils";

type Input = {
  /**
   * The text to say
   */
  content: string;
};

/**
 * Use AI to say things out loud
 */
export default async function ({ content }: Input) {
  const { keepSilentOnError, ...saySettings } = getParsedSaySettings();
  try {
    await say(content, saySettings);
  } catch (error) {
    if (keepSilentOnError) return;
    await say(String(error), saySettings);
  }
}
