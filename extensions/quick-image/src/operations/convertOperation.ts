import invariant from "tiny-invariant";
import type { Operation, Image } from "#/types";
import { getOutputPath } from "#/utils";
import { FORMAT_OPTIONS, FORMAT_ALIAS, SIZE_MAP } from "#/config";
import type { FormatName, SizeName } from "#/config";

// <l: max size large
// l: size large
export const format = "size=<l pos:c";

const positions = {
  c: "center",
  n: "north",
  ne: "northeast",
  e: "east",
  se: "southeast",
  s: "south",
  sw: "southwest",
  w: "west",
  nw: "northwest",
} as const;

export const run: Operation.Run = async ({ name, options, images }) => {
  const format = name as FormatName;
  const outputs = await Promise.all(
    images.map(async (image) => {
      const { size, position } = processOptions(options, image);
      const data = image.data
        .resize({ width: size.width, height: size.height, position })
        .toFormat(format, FORMAT_OPTIONS[format]);
      const write = async () => {
        const outputPath = await getOutputPath(image.path, format, size.display && `(${size.display})`);
        await data.toFile(outputPath);
      };
      return {
        ...image,
        width: size.width,
        height: size.height,
        format: FORMAT_ALIAS[format] || format,
        data,
        write,
      };
    }),
  );
  return outputs;
};

function processOptions(options: Operation.Options, image: Image) {
  invariant(!Array.isArray(options[0]));
  return {
    size: processSize(options[0].size, image),
    position: getPosition(options.pos),
  };
}

function processSize(rawSize: string, image: Image) {
  const hasMaxWidth = rawSize[0] === "<";
  const size = hasMaxWidth ? rawSize.slice(1) : rawSize;
  const newSize = SIZE_MAP[size as SizeName] || size;
  let display: string | null = newSize;
  let width: number | undefined;
  let height: number | undefined;
  if (size === "o") {
    width = image.width;
    height = image.height;
    display = null;
  } else {
    const matches = newSize.match(/(\d+)?x?(\d+)?/);
    invariant(matches && matches[0].length > 0, `size '${size}' is wrong.`);
    width = matches[1] ? Number.parseInt(matches[1]) : undefined;
    height = matches[2] ? Number.parseInt(matches[2]) : undefined;
    if (hasMaxWidth && width && width >= image.width) {
      width = image.width;
      height = image.height;
      display = null;
    }
    if (width && !height) {
      height = Math.ceil((image.height / image.width) * width);
    }
    if (!width && height) {
      width = Math.ceil((image.width / image.height) * height);
    }
  }
  invariant(height !== undefined && width !== undefined, "processSize: width or height is empty");
  return {
    width,
    height,
    display,
  };
}

function getPosition(pos: string): Position {
  const position = positions[pos as PositionKeys];
  invariant(position, `Invalid position '${pos}', valid values are ${Object.keys(positions).join(", ")}`);
  return position;
}

type Positions = typeof positions;

type PositionKeys = keyof Positions;

type Position = Positions[PositionKeys];
