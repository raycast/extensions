import { toggleDisplay } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
};

/**
 * This command allows you to toggle (change fron on to off or vice versa) the display status.
 * Do not attempt to toggle the display status if there is only one physical display, that command
 * will fail. Instead inform the user that the command is not available.
 */
export default function tool(input: Input) {
  const status = toggleDisplay(input.tagID);
  return status;
}
