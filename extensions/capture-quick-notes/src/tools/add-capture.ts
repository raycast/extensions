import { addCapture } from "../capture-cli";

type Input = {
  /**
   * The text content of the capture. URLs and natural-language dates inside
   * the text are extracted automatically by Capture.
   */
  content: string;
  /**
   * The exact name of an existing list to file the capture into. Omit to use
   * the Inbox. Use the get-lists tool to discover list names.
   */
  list?: string;
};

export default async function (input: Input) {
  return await addCapture(input.content, input.list);
}
