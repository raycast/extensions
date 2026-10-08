import { availabilityBrightness, increaseBrightness } from "../commands";
import { adjustDisplayValue } from "./adjust-display-value";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;

  /**
   * The amount to increase the brightness by.
   * The user will most likely provide a value between 0 and 100 (percents).
   * This value should be converted to a number between 0 and 1.
   * If not provided, the default increment value will be used.
   */
  increment?: number;
};

/**
 * This command allows you to increase the brightness of a display.
 * If the command returns 'false' inform the user that the display does
 * not support brightness changes.
 */
export default async function toolIncreaseBrightness(input: Input) {
  return adjustDisplayValue(input, availabilityBrightness, increaseBrightness);
}
