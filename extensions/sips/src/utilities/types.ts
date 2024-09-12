/**
 * @file utilities/types.ts
 *
 * @summary Types used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-07-06 14:47:41
 * Last modified  : 2024-06-26 21:37:46
 */

/**
 * A wrapper around a CIFilter that can be applied to images.
 */
export type Filter = {
  /**
   * The name of the filter.
   */
  name: string;

  /**
   * A brief description of what the filter does.
   */
  description: string;

  /**
   * The method to apply the filter to an image.
   *
   * @param source The path of the image to apply the filter to.
   * @param destination The path to save the filtered image to.
   * @param CIFilterName The name of the CIFilter to apply.
   * @returns A promise that resolves when the operation is complete.
   */
  applyMethod: (source: string, destination: string, CIFilterName: string) => Promise<string>;

  /**
   * The CIFilter name to use when applying the filter.
   */
  CIFilterName: string;

  /**
   * The location in the extension's assets folder of the thumbnail image for the filter.
   */
  thumbnail: string;
};

/**
 * A wrapper around a CIFilter belonging to CICategoryGenerator that can be used to generate images.
 */
export type Generator = {
  /**
   * The name of the generator.
   */
  name: string;

  /**
   * The method to generate an image.
   *
   * @param destination The path to save the generated image to.
   * @param CIFilterName The name of the CIFilter to use to generate the image.
   * @param width The width of the generated image.
   * @param height The height of the generated image.
   * @param inputs The inputs to the CIFilter.
   * @returns A promise that resolves when the operation is complete.
   */
  applyMethod: (
    destination: string,
    CIFilterName: string,
    width: number,
    height: number,
    inputs: { [key: string]: unknown },
  ) => Promise<string>;

  /**
   * The CIFilter name to use when generating the image.
   */
  CIFilterName: string;

  /**
   * The location in the extension's assets folder of the thumbnail image for the generator.
   */
  thumbnail: string;
};

/**
 * Keys for generator filters.
 */
export type GeneratorKey =
  | "Checkerboard"
  | "ConstantColor"
  | "LenticularHalo"
  | "LinearGradient"
  | "RadialGradient"
  | "Random"
  | "StarShine"
  | "Stripes"
  | "Sunbeams";

/**
 * The options to use when generating an image. Corresponds to the key-value pairs in the CIFilter's input dictionary.
 */
export type GeneratorOptions = {
  [key: string]: unknown;
};
