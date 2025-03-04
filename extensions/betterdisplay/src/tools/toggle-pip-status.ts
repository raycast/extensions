import { togglePIP } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
};

/**
 * This command allows you to toggle (change fron on to off or vice versa) the PIP status.
 * Do not attempt to toggle the PIP status if the display is not turned on.
 * Instead inform the user that the command is not available.
 */
export default function tool(input: Input) {
  const status = togglePIP(input.tagID);
  return status;
}
