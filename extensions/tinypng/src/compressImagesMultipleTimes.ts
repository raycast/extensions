import { statSync, createReadStream, createWriteStream } from "node:fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD, LaunchProps } from "@raycast/api";
import fetch from "node-fetch";
import { compressImageResponseScheme } from "./lib/zodSchema";
import { filterSupportedImagePaths, isMacOS, resolveOutputFile } from "./lib/utils";
import { showFailureToast } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

export default async function main(props: LaunchProps<{ arguments: Arguments.CompressImagesMultipleTimes }>) {
  let filePaths: string[];
  let compressionCount: number;

  try {
    compressionCount = _parseCompressionCount(props.arguments.count);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Could not validate arguments" });
    return;
  }

  try {
    filePaths = filterSupportedImagePaths((await getSelectedFinderItems()).map((f) => f.path));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not get the selected ${isMacOS ? "Finder" : "File Explorer"} items` });
    return;
  }

  if (filePaths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No images found",
      message: "Selected files must be AVIF, PNG, JPEG or WebP images.",
    });
    return;
  }

  const isSingleFile = filePaths.length === 1;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Compressing ${filePaths.length} ${isSingleFile ? "image" : "images"} ${compressionCount} times...`,
  });

  try {
    const results = await Promise.all(
      filePaths.map((filePath) => _compressImage(filePath, isSingleFile, compressionCount)),
    );
    const totalOriginalSize = results.reduce((acc, cur) => acc + cur[0].originalSize, 0);
    const totalCompressedSize = results.reduce((acc, cur) => acc + cur[0].compressedSize, 0);

    await showHUD(
      `Compression successful 🎉  (-${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%)`,
    );
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = error instanceof Error ? error.message : "Failed to compress images";
  }
}

const _parseCompressionCount = (count: string | undefined) => {
  if (!count) {
    return 2;
  }

  const compressionCount = Number(count.split(" ")[0]);

  if (!Number.isInteger(compressionCount) || compressionCount < 1) {
    throw new Error("Compression count must be a positive integer");
  }

  return compressionCount;
};

const _compressImage = async (
  filePath: string,
  isSingleFile: boolean,
  compressionCount: number,
): Promise<
  [
    {
      originalSize: number;
      compressedSize: number;
    },
  ]
> => {
  const { size } = statSync(filePath);

  let input = createReadStream(filePath) as Buffer | ReturnType<typeof createReadStream>;
  let inputSize = size;
  let compressedImage = Buffer.alloc(0);

  for (let i = 0; i < compressionCount; i++) {
    compressedImage = await _compressImageOnce(input, inputSize);
    input = compressedImage;
    inputSize = compressedImage.length;
  }

  // Save compressed image
  const outputPath = resolveOutputFile(filePath, {
    destinationFolderPath: preferences.destinationFolderPath,
    overwrite: preferences.overwrite,
    isSingleFile: preferences.saveSingleFileNextToOriginal && isSingleFile,
    suffix: `-compressed-${compressionCount}x`,
  });

  const outputFileStream = createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    outputFileStream.write(compressedImage, (error) => {
      if (error) {
        reject(error);
        return;
      }

      outputFileStream.end(resolve);
    });
  });

  return [
    {
      originalSize: size,
      compressedSize: compressedImage.length,
    },
  ];
};

const _compressImageOnce = async (body: Buffer | ReturnType<typeof createReadStream>, size: number) => {
  // Upload image
  const resPost = await fetch("https://api.tinify.com/shrink", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${preferences.apiKey}`).toString("base64")}`,
      contentLength: size.toString(),
    },
    body,
  });

  const resJson = compressImageResponseScheme.parse(await resPost.json());

  // Validate
  if ("error" in resJson) {
    throw new Error(resJson.message);
  }

  // Download compressed image
  const downloadUrl = resJson.output.url;
  const resGet = await fetch(downloadUrl);

  if (!resGet.ok) {
    throw new Error(`Failed to download compressed image: ${resGet.status} ${resGet.statusText}`);
  }

  return Buffer.from(await resGet.arrayBuffer());
};
