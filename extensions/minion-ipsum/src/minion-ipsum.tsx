import { generateMinionIpsum, produceOutput } from "./utils";

type LoremIpsumArguments = {
  numberOfParagraphs?: string;
};

export default async function ParagraphCommand(props?: { arguments: LoremIpsumArguments }) {
  const numberOfParagraphs = props?.arguments?.numberOfParagraphs ? parseInt(props.arguments.numberOfParagraphs) : 1;
  const output = generateMinionIpsum({ numberOfParagraphs });

  await produceOutput(output);
}
