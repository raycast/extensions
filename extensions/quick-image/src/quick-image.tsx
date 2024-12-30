import { type LaunchProps, closeMainWindow, showToast, Toast } from "@raycast/api";
import sharp from "sharp";
import invariant from "tiny-invariant";
import { getSelectedImages } from "#/utils";
import { parseInput } from "#/parseInput";
import { DEFAULT_OPERATION } from "#/config";
import type { Image } from "#/types";
import { getOperation } from "#/operations";

interface Props {
  arguments: {
    input: string;
  };
}

export default async function Command(props: LaunchProps<Props>) {
  showToast({
    style: Toast.Style.Animated,
    title: "Processing",
  });
  const paths = await getSelectedImages();
  let images: Image[] = [];
  for (const path of paths) {
    const metadata = await sharp(path).metadata();
    invariant(metadata.width !== undefined && metadata.height !== undefined, `File ${path} has no width or height`);
    invariant(metadata.format !== undefined, `Unknown format for ${path}`);
    const data = sharp(path);
    const write = () => {
      throw new Error("write method is not implemented");
    };
    images.push({
      path,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      data,
      write,
    });
  }

  const { input: rawInput } = props.arguments;
  const input = rawInput.trim().length === 0 ? DEFAULT_OPERATION : rawInput;
  const operations = parseInput(input, getOperation);
  for (const operation of operations) {
    const { run, name, options } = operation;
    images = await run({ name, options, images });
  }
  for (const image of images) {
    await image.write();
  }
  closeMainWindow({ clearRootSearch: true });
}
