import { existsSync } from "fs";
import { mkdirSync } from "fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD, LaunchProps } from "@raycast/api";
import { statSync, createReadStream, createWriteStream } from "fs";
import fetch from "node-fetch";
import { dirname, basename, join, extname } from "path";
import { compressImageResponseScheme } from "./lib/zodSchema";
import { resolveOutputPath } from "./lib/utils";

const preferences = getPreferenceValues<Preferences>();

export default async function main(props: LaunchProps<{ arguments: Arguments.CompressImagesMultipleTimes }>) {
  let filePaths: string[];
  let compressionCount: number;

  try {
    compressionCount = _parseCompressionCount(props.arguments.count);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not validate arguments",
    });
    return;
  }

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
    title: `Compressing images ${compressionCount} times...`,
  });

  try {
    const results = await Promise.all(filePaths.map((filePath) => _compressImage(filePath, compressionCount)));
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
    outputPath = join(outputDir, `${basename(filePath, ext)}.compressed-${compressionCount}x${ext}`);
  }

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
