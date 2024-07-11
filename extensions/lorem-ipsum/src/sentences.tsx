import { closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { generateSentences, produceOutput, safeLoremIpsumNumberArg } from "./utils";

export default async function SentenceCommand(props?: LaunchProps<{ arguments: Arguments.Sentences }>) {
  const numberArg = props?.arguments.numberOfSentences;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await closeMainWindow();
    await showToast(Toast.Style.Failure, error.message);
  } else {
    const output = generateSentences(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
