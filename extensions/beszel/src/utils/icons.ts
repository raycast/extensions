import { Color, Icon, type Image } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

/**
 * Retrieve the up/down status indicator icon based on the beszel status string
 * @param status
 * @returns ImageLike
 */
export const getUpDownIndicatorIcon = (status: string): Image.ImageLike | undefined => {
  switch (status) {
    case "up":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "down":
      return { source: Icon.CircleDisabled, tintColor: Color.Red };
    default:
      return undefined;
  }
};

/**
 * Retrieve a circle progress icon based on a load average (0 - 100)
 * @param loadAverage
 * @returns ImageLike
 */
export const getSystemLoadIndicatorIcon = (loadAverage: number): Image.ImageLike => {
  let color = Color.Green;
  if (loadAverage > 70) {
    color = Color.Red;
  } else if (loadAverage > 55) {
    color = Color.Orange;
  } else if (loadAverage > 25) {
    color = Color.Yellow;
  }

  return getProgressIcon(loadAverage / 100, color);
};
