import { copyTextToClipboard } from "@raycast/api";
import { generateSentence, notify } from "./utils";

export default async function SentenceCommand() {
  const output = generateSentence();

  await copyTextToClipboard(output);
  await notify();

  return null;
}
