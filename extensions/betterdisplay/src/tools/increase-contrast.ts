import { availabilityContrast, increaseContrast } from "../commands";

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
  if (!(await availabilityContrast(input.tagID))) {
    return false;
  }

  const increment =
    typeof input.increment === "number" && input.increment >= 0 && input.increment <= 1 ? input.increment : undefined;

  try {
    return await increaseContrast(input.tagID, increment);
  } catch (error) {
    return false;
  }
}
