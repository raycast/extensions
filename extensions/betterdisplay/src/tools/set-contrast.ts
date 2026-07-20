import { availabilityContrast, setContrast } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;

  /**
   * The amount to set the contrast to.
   * The user will most likely provide a value between 0 and 100 (percents).
   * This value should be converted to a number between -1 and 1.
   * Make absolutely sure to round the value to one decimal place.
   * A contrast of 50% should be converted to 0.
   */
  intensity: string;
};

/**
 * This command allows you to set the contrast of a display.
 * If the command returns 'false' inform the user that the display does
 * not support contrast changes.
 */
export default async function toolSetContrast(input: Input) {
  if (!availabilityContrast(input.tagID)) {
    return false;
  }

  const intensity = Math.max(-0.9, Math.min(Number(input.intensity), 0.9));

  return await setContrast(input.tagID, intensity);
}
