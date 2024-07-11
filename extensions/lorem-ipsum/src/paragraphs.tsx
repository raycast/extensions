import { closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { generateParagraphs, produceOutput, safeLoremIpsumNumberArg } from "./utils";

export default async function ParagraphCommand(props?: LaunchProps<{ arguments: Arguments.Paragraphs }>) {
  const numberArg = props?.arguments.numberOfParagraphs;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await closeMainWindow();
    await showToast(Toast.Style.Failure, error.message);
  } else {
    const output = generateParagraphs(safeLoremIpsumNumber);
    await produceOutput(output);
  }
}
