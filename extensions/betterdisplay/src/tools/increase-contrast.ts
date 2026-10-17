import { availabilityContrast, increaseContrast } from "../commands";
import { adjustDisplayValue } from "./adjust-display-value";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;

  /**
   * The amount to increase the contrast by.
   * The user will most likely provide a value between 0 and 100 (percents).
   * This value should be converted to a number between 0 and 1.
   * If not provided, the default increment value will be used.
   */
  increment?: number;
};

/**
 * This command allows you to increase the contrast of a display.
 * If the command returns 'false' inform the user that the display does
 * not support contrast changes.
 */
export default async function toolIncreaseContrast(input: Input) {
  return adjustDisplayValue(input, availabilityContrast, increaseContrast);
}
