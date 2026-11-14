import { LaunchProps } from "@raycast/api";
import { generateWords, showError, produceOutput, safeLoremIpsumNumberArg } from "./utils";

export default async function WordCommand(props?: LaunchProps<{ arguments: Arguments.Words }>) {
  const numberArg = props?.arguments.numberOfWords;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showError(error.message);
  } else {
    const output = generateWords(safeLoremIpsumNumber);
    try {
      await produceOutput(output);
    } catch {
      await showError("Failed to copy generated words");
    }
  }
}
