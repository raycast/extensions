import { showHUD } from "@raycast/api";
import { generateHtmlParagraphs, produceOutput, safeLoremIpsumNumberArg } from "./utils";
import { LoremIpsumArguments } from "./types";

export default async function HtmlParagraphCommand(props?: { arguments: LoremIpsumArguments }) {
  const numberArg = props?.arguments.numberOfLoremIpsumsToGenerate;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showHUD(`❌ ${error.message}`);
  } else {
    const output = generateHtmlParagraphs(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
