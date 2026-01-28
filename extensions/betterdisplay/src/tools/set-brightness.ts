import { availabilityBrightness, setBrightness } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;

  /**
   * The amount to set the brightness to.
   * The user will most likely provide a value between 0 and 100 (percents).
   * This value should be converted to a number between 0 and 1.
   */
  intensity: string;
};

/**
 * This command allows you to set the brightness of a display.
 * If the command returns 'false' inform the user that the display does
 * not support brightness changes.
 */
export default async function toolSetBrightness(input: Input) {
  if (!availabilityBrightness(input.tagID)) {
    return false;
  }

  const intensity = Math.max(0, Math.min(Number(input.intensity), 1));

  return await setBrightness(input.tagID, intensity);
}
