import { LaunchProps } from "@raycast/api";
import { generateSentences, showError, produceOutput, safeLoremIpsumNumberArg } from "./utils";

export default async function SentenceCommand(props?: LaunchProps<{ arguments: Arguments.Sentences }>) {
  const numberArg = props?.arguments.numberOfSentences;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showError(error.message);
  } else {
    const output = generateSentences(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
