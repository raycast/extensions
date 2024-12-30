import sharp from "sharp";
import { maxBy } from "lodash";
import invariant from "tiny-invariant";
import { getOutputPath } from "#/utils";
import type { Operation, Image } from "#/types";
import { FORMAT_OPTIONS } from "#/config";
import type { FormatName } from "#/config";

export const format = "gap:color=black,size=2 bg:color=transparent";

export const run: Operation.Run = async ({ name: rawName, options, images }) => {
  const name = rawName as Name;
  const { gap, bg } = processOptions(options);
  const { outMetadata, inputs } = await calcs[name]({ gap, images });
  const data = sharp({
    create: { width: outMetadata.width, height: outMetadata.height, channels: 4, background: bg.color },
  })
    .composite(inputs)
    .toFormat(outMetadata.format as FormatName, FORMAT_OPTIONS[outMetadata.format as FormatName]);
  const write = async () => {
    const outputPath = await getOutputPath(outMetadata.path, outMetadata.format, "(Combined)");
    await data.toFile(outputPath);
  };
  return [
    {
      ...images[0],
      width: outMetadata.width,
      height: outMetadata.height,
      format: outMetadata.format,
      data,
      write,
    },
  ];
};

function processOptions(options: Operation.Options) {
  const { gap, bg } = options;
  invariant(!Array.isArray(gap));
  invariant(!Array.isArray(bg));
  return {
    gap: {
      color: gap.color,
      size: Number.parseInt(gap.size),
    },
    bg: {
      color: bg.color,
    },
  };
}

async function calcHorizontal({ gap, images }: CalcOptions) {
  const outImage = maxBy(images, (image) => image.height);
  invariant(outImage !== undefined, "Can't find max width/height image");
  const outHeight = outImage.height;
  let left = 0;
  const inputs: (Promise<sharp.OverlayOptions> | sharp.OverlayOptions)[] = [];
  for (const [index, image] of images.entries()) {
    // gap
    if (index > 0) {
      inputs.push({
        input: {
          create: {
            width: gap.size,
            height: outHeight,
            channels: 4,
            background: gap.color,
          },
        },
        left,
        top: 0,
      });
      left = left + gap.size;
    }
    inputs.push(
      new Promise((resolve) => {
        const localLeft = left;
        image.data.toBuffer().then((buffer) => {
          resolve({
            input: buffer,
            left: localLeft,
            top: 0,
          });
        });
      }),
    );
    left = left + image.width;
  }
  const result = {
    outMetadata: {
      width: left,
      height: outHeight,
      path: outImage.path,
      format: outImage.format,
    },
    inputs: await Promise.all(inputs),
  };
  return result;
}

async function calcVertical({ gap, images }: CalcOptions) {
  const reversedImages = images.map((image) => {
    return {
      ...image,
      width: image.height,
      height: image.width,
    };
  });
  const { outMetadata, inputs } = await calcHorizontal({ gap, images: reversedImages });
  return {
    outMetadata: {
      ...outMetadata,
      width: outMetadata.height,
      height: outMetadata.width,
    },
    inputs: inputs.map((input) => ({
      ...input,
      left: input.top,
      top: input.left,
    })),
  };
}

const calcs = {
  hor: calcHorizontal,
  ver: calcVertical,
};

export type Name = "hor" | "ver";

export type Gap = {
  size: number;
  color: string;
};

export type Bg = {
  color: string;
};

export type CalcOptions = {
  gap: Gap;
  images: Image[];
};

export const collageOperation = {
  format,
  run,
};
