import { Jimp } from "jimp";
import pixelmatch from "pixelmatch";

export const compare = async (
  actual: string,
  expected: string,
): Promise<{ diffBuffer: Buffer; width: number; height: number }> => {
  const actualImage = await Jimp.read(actual);
  const expectedImage = await Jimp.read(expected);

  const { width, height } = actualImage;

  if (expectedImage.bitmap.width !== width || expectedImage.bitmap.height !== height) {
    expectedImage.resize({ w: width, h: height });
  }

  const actualBuffer = actualImage.bitmap.data;
  const expectedBuffer = expectedImage.bitmap.data;
  const diffBuffer = Buffer.alloc(actualBuffer.length);

  pixelmatch(actualBuffer, expectedBuffer, diffBuffer, width, height, { threshold: 0.2 });

  return { diffBuffer, width, height };
};
