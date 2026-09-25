import { archiveCapture } from "../capture-cli";

type Input = {
  /** The id of the capture, as returned by the get-captures tool. */
  id: string;
  /** Set to true to unarchive instead of archive. */
  unarchive?: boolean;
};

export default async function (input: Input) {
  return await archiveCapture(input.id, input.unarchive ?? false);
}
