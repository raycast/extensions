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
export default async function tool(input: Input) {
  await fullScreen(input.text);
}
