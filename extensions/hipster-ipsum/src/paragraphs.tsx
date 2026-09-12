import { LaunchProps } from "@raycast/api";
import { getParagraphs, produceOutput, showError } from "./utils";

export default async function ParagraphsCommand(props?: LaunchProps<{ arguments: Arguments.Paragraphs }>) {
  const { error, paragraphs } = await getParagraphs(props?.arguments.numberOfParagraphs);

  if (error) {
    await showError(error.message);
  } else {
    await produceOutput(paragraphs.join("\n"));
  }
}
