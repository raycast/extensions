import { updateCapture } from "../capture-cli";

type Input = {
  /** The id of the capture to update, as returned by the get-captures tool. */
  id: string;
  /** New content for the capture. Replaces the existing content entirely. */
  content?: string;
  /** The exact name of an existing list to move the capture into. */
  list?: string;
  /** Set to true to move the capture out of its list back to the Inbox. */
  clearList?: boolean;
};

export default async function (input: Input) {
  return await updateCapture(input.id, {
    content: input.content,
    list: input.list,
    clearList: input.clearList,
  });
}
