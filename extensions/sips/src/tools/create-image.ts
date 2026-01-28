import os from "os";
import path from "path";

import {
  generators,
  getCheckerboardOptions,
  getLenticularHaloOptions,
  getLinearGradientOptions,
  getRadialGradientOptions,
  getSolidColorOptions,
  getStarShineOptions,
  getStripeOptions,
  getSunbeamsOptions,
} from "../utilities/generators";
import { cleanup, getDestinationPaths, moveImageResultsToFinalDestination } from "../utilities/utils";

type Input = {
  /**
   * The style of image to generate.
   */
  style:
    | "Checkerboard"
    | "Constant Color"
    | "Lenticular Halo"
    | "Linear Gradient"
    | "Radial Gradient"
    | "Random"
    | "Star Shine"
    | "Stripes"
    | "Sunbeams";

  /**
   * The width of the generated image.
   */
  width: number;

  /**
   * The height of the generated image.
   */
  height: number;

  /**
   * One or more colors to use in the image, represented in HEX format (e.g. FF0000 for red).
   */
  colors: string[];
};

export default async function ({ style, width, height, colors }: Input) {
  if (!style) {
    throw new Error("Missing required parameter: style");
  }

  if (!width) {
    throw new Error("Missing required parameter: width");
  }

  if (!height) {
    throw new Error("Missing required parameter: height");
  }

  if (!colors) {
    throw new Error("Missing required parameter: colors");
  }

  const generator = Object.values(generators).find((g) => g.name === style);
  if (!generator) {
    throw new Error(`Invalid value for style: must be one of ${Object.keys(generators).join(", ")}`);
  }

  const validatedWidth = parseInt(width.toString());
  const validatedHeight = parseInt(height.toString());
  if (isNaN(validatedWidth) || validatedWidth < 1) {
    throw new Error("Invalid value for width: must be a positive integer");
  }
  if (isNaN(validatedHeight) || validatedHeight < 1) {
    throw new Error("Invalid value for height: must be a positive integer");
  }

  if (!Array.isArray(colors)) {
    throw new Error("Invalid value for colors: must be an array of HEX color strings");
  }

  const validatedColors = colors.filter((c) => c.match(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/));
  if (validatedColors.length !== colors.length) {
    throw new Error("Invalid value for colors: must be an array of HEX color strings");
  }

  const rgbColors = colors.map((c) => {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const a = 255;
    return { red: r, green: g, blue: b, alpha: a };
  });

  if (rgbColors.length === 0) {
    rgbColors.push({ red: 0, green: 0, blue: 0, alpha: 255 });
  }

  const reds = rgbColors.map((c) => c.red);
  const greens = rgbColors.map((c) => c.green);
  const blues = rgbColors.map((c) => c.blue);
  const alphas = rgbColors.map((c) => c.alpha);

  let options: { [key: string]: unknown } = getCheckerboardOptions(reds, greens, blues, alphas, 16)[0];
  switch (generator.name) {
    case "Constant Color":
      options = getSolidColorOptions(reds, greens, blues)[0];
      break;
    case "Lenticular Halo":
      options = getLenticularHaloOptions(reds, greens, blues, alphas);
      break;
    case "Linear Gradient":
      options = getLinearGradientOptions(reds, greens, blues, alphas)[0];
      break;
    case "Radial Gradient":
      options = getRadialGradientOptions(reds, greens, blues, alphas)[0];
      break;
    case "Random":
      options = {};
      break;
    case "Star Shine":
      options = getStarShineOptions(reds, greens, blues, alphas);
      break;
    case "Stripes":
      options = getStripeOptions(reds, greens, blues, alphas, 32)[0];
      break;
    case "Sunbeams":
      options = getSunbeamsOptions(reds, greens, blues, alphas);
      break;
  }

  const destinations = await getDestinationPaths(
    [path.join(os.tmpdir(), `${style.replaceAll(" ", "_").toLowerCase()}.png`)],
    true,
  );
  try {
    await generator.applyMethod(destinations[0], generator.CIFilterName, validatedWidth, validatedHeight, options);
    await moveImageResultsToFinalDestination(destinations);
  } catch (error) {
    throw new Error(`Failed To Create ${style}: ${error}`);
  } finally {
    cleanup();
  }
  return destinations;
}
