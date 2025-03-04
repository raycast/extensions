import { fetchPipStatus } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
};

/**
 * This command allows you to get the status of a the PIP (Picture in Picture)
 * feature of adisplay you have a tagID for.
 * The status can be either "on" or "off".
 */
export default function tool(input: Input) {
  const status = fetchPipStatus(input.tagID);
  return status;
}
