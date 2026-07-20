import { Jimp } from "jimp";
import pixelmatch from "pixelmatch";

export const compare = async (
  actual: string,
  expected: string,
  threshold: string,
): Promise<{ diffBuffer: Buffer; width: number; height: number }> => {
  try {
    const actualImage = await Jimp.read(actual);
    const expectedImage = await Jimp.read(expected);

    const actualWidth = actualImage.bitmap.width;
    const actualHeight = actualImage.bitmap.height;
    const expectedWidth = expectedImage.bitmap.width;
    const expectedHeight = expectedImage.bitmap.height;

    if (actualWidth !== expectedWidth || actualHeight !== expectedHeight) {
      throw new Error(
        `Image sizes don't match. Actual: ${actualWidth}x${actualHeight}, Expected: ${expectedWidth}x${expectedHeight}`,
      );
    }

    const actualBuffer = actualImage.bitmap.data;
    const expectedBuffer = expectedImage.bitmap.data;
    const diffBuffer = Buffer.alloc(actualBuffer.length);

    // threshold is a number between 0 and 1
    const thresholdClamped = Math.min(1, Math.max(0, parseFloat(threshold)));
    pixelmatch(actualBuffer, expectedBuffer, diffBuffer, actualWidth, actualHeight, { threshold: thresholdClamped });

    return { diffBuffer, width: actualWidth, height: actualHeight };
  } catch (error) {
    throw new Error("An error occurred while comparing images.");
  }
};
