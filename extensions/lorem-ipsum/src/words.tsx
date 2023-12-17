import { showHUD } from "@raycast/api";
import { generateWords, produceOutput, safeLoremIpsumNumberArg } from "./utils";
import { LoremIpsumArguments } from "./types";

export default async function WordCommand(props?: { arguments: LoremIpsumArguments }) {
  const numberArg = props?.arguments.numberOfLoremIpsumsToGenerate;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showHUD(`❌ ${error.message}`);
  } else {
    const output = generateWords(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
