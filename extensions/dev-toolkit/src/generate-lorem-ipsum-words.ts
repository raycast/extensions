import { LaunchProps } from "@raycast/api";
import { LoremIpsum } from "lorem-ipsum";
import { produceOutput, safeNumberArg, showError } from "./utils";

export default async function Command(props?: LaunchProps<{ arguments: Arguments.GenerateLoremIpsumWords }>) {
  const numberArg = props?.arguments.numberOfWords;
  const { error, safeNumber } = await safeNumberArg(numberArg, { min: 1, max: 1000, default: 5 });

  if (error) {
    await showError(error.message);
  } else {
    const lorem = new LoremIpsum({
      sentencesPerParagraph: {
        max: 8,
        min: 4,
      },
      wordsPerSentence: {
        max: 16,
        min: 4,
      },
    });
    const output = lorem.generateWords(safeNumber);
    await produceOutput(output);
  }
}
