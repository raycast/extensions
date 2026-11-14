import { openCapture } from "../capture-cli";

type Input = {
  /** The id of the capture to open, as returned by the get-captures tool. */
  id: string;
};

export default async function (input: Input) {
  await openCapture(input.id);
  return { opened: true };
}
