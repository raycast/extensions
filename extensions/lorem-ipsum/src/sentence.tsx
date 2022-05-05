import { getPreferenceValues } from "@raycast/api";
import { generateSentence, preformAction } from "./utils";

export default async function SentenceCommand() {
  const { action = "clipboard" } = getPreferenceValues();
  const output = generateSentence();

  await preformAction(action, output);

  return null;
}
