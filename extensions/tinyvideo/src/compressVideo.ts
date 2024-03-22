import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { statSync } from "fs";
import { basename, extname } from "path";

import { execute } from "./util/exec";
import { sleep } from "./util/delay";

const SUPPORTED_EXTENSIONS = [".mp4", ".mov"];

async function compressVideo(filePath: string) {
  const { size: originalSize } = statSync(filePath);

  const filename = basename(filePath);
  const extensionName = extname(filename);

  const compressedFilePath = filePath.replace(extensionName, `-compressed-${new Date().getTime()}${extensionName}`);

  const cmd = `ffmpeg -i SRC -vcodec libx264 -crf 28 DEST`;
  const [ffmpeg, ...rest] = cmd.split(" ");

  await execute(
    ffmpeg,
    ...rest.map((arg) => {
      if (arg === "SRC") {
        return `"${filePath}"`;
      } else if (arg === "DEST") {
        return `"${compressedFilePath}"`;
      }
      return arg;
    }),
  );

  const { size: compressedSize } = statSync(compressedFilePath);

  return {
    originalSize,
    compressedSize,
  };
}

function checkExtensions(filePaths: string[]) {
  return filePaths.map((filePath) => extname(filePath)).every((extension) => SUPPORTED_EXTENSIONS.includes(extension));
}

export default async function main() {
  let filePaths: string[];

  try {
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Could not get the selected Finder items",
    });
    return;
  }

  if (filePaths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "No files selected",
    });
    return;
  }

  if (!checkExtensions(filePaths)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `List of supported extensions: ${SUPPORTED_EXTENSIONS.join(", ")}`,
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: filePaths.length > 1 ? "Compressing videos..." : "Compressing video...",
  });

  try {
    const results = await Promise.all(filePaths.map(compressVideo));
    const totalOriginalSize = results.reduce((acc, cur) => acc + cur.originalSize, 0);
    const totalCompressedSize = results.reduce((acc, cur) => acc + cur.compressedSize, 0);

    toast.style = Toast.Style.Success;
    toast.title = "Compression successful 🎉";
    toast.message = `(-${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%)`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = error instanceof Error ? error.message : "Could not compress one or more videos";
  }

  await sleep(3000);
}
