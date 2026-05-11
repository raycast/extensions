import { fetchPipStatus } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
};

/**
 * This command allows you to get the status of a the PIP (Picture in Picture)
 * feature of a display you have a tagID for.
 * The status can be either "on" or "off".
 */
export default async function getPipStatus(input: Input) {
  const status = await fetchPipStatus(input.tagID);
  return status;
}
