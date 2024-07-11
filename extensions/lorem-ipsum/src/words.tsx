import { LaunchProps, showToast, Toast, closeMainWindow } from "@raycast/api";
import { generateWords, produceOutput, safeLoremIpsumNumberArg } from "./utils";

export default async function WordCommand(props?: LaunchProps<{ arguments: Arguments.Words }>) {
  const numberArg = props?.arguments.numberOfWords;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await closeMainWindow();
    await showToast(Toast.Style.Failure, error.message);
  } else {
    const output = generateWords(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
