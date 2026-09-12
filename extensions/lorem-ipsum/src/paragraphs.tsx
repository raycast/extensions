import { LaunchProps } from "@raycast/api";
import { generateParagraphs, showError, produceOutput, safeLoremIpsumNumberArg } from "./utils";

export default async function ParagraphCommand(props?: LaunchProps<{ arguments: Arguments.Paragraphs }>) {
  const numberArg = props?.arguments.numberOfParagraphs;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showError(error.message);
  } else {
    const output = generateParagraphs(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
