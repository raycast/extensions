import { existsSync } from "fs";
import { mkdirSync } from "fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD } from "@raycast/api";
import { statSync, createReadStream, createWriteStream } from "fs";
import fetch from "node-fetch";
import { dirname, basename, join, extname } from "path";
import { compressImageResponseScheme } from "./lib/zodSchema";
import { resolveOutputPath } from "./lib/utils";

const preferences = getPreferenceValues<Preferences>();

export default async function main() {
  let filePaths: string[];

  try {
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Compressing images...",
  });

  try {
    const results = await Promise.all(filePaths.map((filePath) => _compressImage(filePath)));
    const totalOriginalSize = results.reduce((acc, cur) => acc + cur[0].originalSize, 0);
    const totalCompressedSize = results.reduce((acc, cur) => acc + cur[0].compressedSize, 0);

    await showHUD(
      `Compression successful 🎉  (-${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%)`,
    );
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = e instanceof Error ? e.message : "failed to compress images";
  }
}

const _compressImage = async (
  filePath: string,
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
  let outputDir = dirname(filePath);
  if (!preferences.overwrite) {
    outputDir = resolveOutputPath(filePath, preferences.destinationFolderPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir);
    }
  }

  let outputPath = join(outputDir, basename(filePath));
  if (outputPath === filePath && !preferences.overwrite) {
    const ext = extname(filePath);
    outputPath = join(outputDir, `${basename(filePath, ext)}.compressed${ext}`);
  }

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
