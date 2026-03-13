import { LaunchProps } from "@raycast/api";
import { getSentences, produceOutput, showError } from "./utils";

export default async function SentencesCommand(props?: LaunchProps<{ arguments: Arguments.Sentences }>) {
  const { error, sentences } = await getSentences(props?.arguments.numberOfSentences);

  if (error) {
    await showError(error.message);
  } else {
    await produceOutput(sentences.join("\n"));
  }
}
