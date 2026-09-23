import { statSync, createReadStream, createWriteStream } from "node:fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD } from "@raycast/api";
import fetch from "node-fetch";
import { compressImageResponseScheme } from "./lib/zodSchema";
import { filterSupportedImagePaths, isMacOS, resolveOutputFile } from "./lib/utils";
import { showFailureToast } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();

export default async function main() {
  let filePaths: string[];

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
      message: "Selected files must be AVIF, PNG, JPEG or WebP images",
    });
    return;
  }

  const isSingleFile = filePaths.length === 1;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Compressing ${filePaths.length} ${isSingleFile ? "image" : "images"}…`,
  });

  try {
    const results = await Promise.all(filePaths.map((filePath) => _compressImage(filePath, isSingleFile)));
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

const _compressImage = async (
  filePath: string,
  isSingleFile: boolean,
): Promise<
  [
    {
      originalSize: number;
      compressedSize: number;
    },
  ]
> => {
  const { size } = statSync(filePath);

  const readStream = createReadStream(filePath);

  // Upload original image
  const resPost = await fetch("https://api.tinify.com/shrink", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${preferences.apiKey}`).toString("base64")}`,
      contentLength: size.toString(),
    },
    body: readStream,
  });

  const resJson = compressImageResponseScheme.parse(await resPost.json());

  // Validate
  if ("error" in resJson) {
    throw new Error(resJson.message);
  }

  // Download compressed image
  const downloadUrl = resJson.output.url;
  const resGet = await fetch(downloadUrl);

  // Save compressed image
  const outputPath = resolveOutputFile(filePath, {
    destinationFolderPath: preferences.destinationFolderPath,
    overwrite: preferences.overwrite,
    isSingleFile: preferences.saveSingleFileNextToOriginal && isSingleFile,
    suffix: "-compressed",
  });

  const outputFileStream = createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    resGet.body?.pipe(outputFileStream);
    resGet.body?.on("error", reject);
    outputFileStream.on("finish", resolve);
  });

  return [
    {
      originalSize: size,
      compressedSize: resJson.output.size,
    },
  ];
};
