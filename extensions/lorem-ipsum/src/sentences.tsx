import { getPreferenceValues, showHUD } from "@raycast/api";
import { generateSentences, preformAction, safeLoremIpsumNumberArg } from "./utils";
import { LoremIpsumArguments } from "./types";

export default async function SentenceCommand(props: { arguments: LoremIpsumArguments }) {
  const { action = "clipboard" } = getPreferenceValues();

  const { numberOfLoremIpsumsToGenerate } = props.arguments;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberOfLoremIpsumsToGenerate);

  if (error) {
    await showHUD(`❌ ${error.message}`);
  } else {
    const output = generateSentences(safeLoremIpsumNumber);
    await preformAction(action, output);
  }
}
