import { showHUD } from "@raycast/api";
import { generateSentences, produceOutput, safeLoremIpsumNumberArg } from "./utils";
import { LoremIpsumArguments } from "./types";

export default async function SentenceCommand(props?: { arguments: LoremIpsumArguments }) {
  const numberArg = props?.arguments.numberOfLoremIpsumsToGenerate;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showHUD(`❌ ${error.message}`);
  } else {
    const output = generateSentences(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
