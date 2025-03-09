import { fullScreen } from "swift:../../swift/fullscreen";

type Input = {
  /**
   * The text to display fullscreen.
   */
  text: string;
};

/**
 * A function that allows yout to display text fullscreen.
 */
export default function tool(input: Input) {
  fullScreen(input.text);
}
