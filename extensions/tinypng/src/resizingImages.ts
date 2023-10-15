import { existsSync } from "fs";
import { mkdirSync } from "fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD } from "@raycast/api";
import { statSync, createReadStream, createWriteStream } from "fs";
import fetch from "node-fetch";
import { dirname, basename, join } from "path";

type Preferences = {
  apiKey: string;
};

const preferences = getPreferenceValues<Preferences>();

type Props = {
  arguments: {
    method: string;
    width?: string;
    height?: string;
  };
};

export default async function main(props: Props) {
  let filePaths: string[];

  try {
    _validateArguments(props.arguments);
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
    title: "Resizing images...",
  });

  try {
    const results = await Promise.all(filePaths.map((filePath) => _compressAndResizeImage(filePath, props)));
    const totalOriginalSize = results.reduce((acc, cur) => acc + cur[0].originalSize, 0);
    const totalCompressedSize = results.reduce((acc, cur) => acc + cur[0].compressedSize, 0);

    await showHUD(`Resizing successful 🎉  (-${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%)`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = e instanceof Error ? e.message : "failed to compress images";
  }
}

const _validateArguments = (args: Props["arguments"]) => {
  if (!["fit", "scale", "cover", "thumb"].some((m) => m === args.method)) {
    throw new Error("Invalid method. Available values are values are 'fit', 'scale', 'cover', 'thumb'");
  }
  if (args.width && isNaN(Number(args.width))) {
    throw new Error("Invalid width");
  }
  if (args.height && isNaN(Number(args.height))) {
    throw new Error("Invalid height");
  }
  if (args.method === "fit" && !(args.width && args.height)) {
    throw new Error("Width and height are required for fit method");
  }
  if (args.method === "scale" && !(args.width || args.height)) {
    throw new Error("Width or height are required for scale method");
  }
  if (args.method === "cover" && !(args.width && args.height)) {
    throw new Error("Width and height are required for cover method");
  }
  if (args.method === "thumb" && !(args.width && args.height)) {
    throw new Error("Width and height are required for thumb method");
  }
};

const _compressAndResizeImage = async (
  filePath: string,
  props: Props
): Promise<
  [
    {
      originalSize: number;
      compressedSize: number;
    }
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

  const resJson = (await resPost.json()) as {
    output: { size: number; url: string };
    error: string;
    message: string;
  };

  // Validate
  if ("error" in resJson) {
    throw new Error(resJson.message);
  }

  // Download compressed image
  const downloadUrl = resJson.output.url;

  const resResized = await fetch(downloadUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${preferences.apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resize: {
        method: props.arguments.method,
        width: Number(props.arguments.width),
        height: Number(props.arguments.height),
      },
    }),
  });

  const outputDir = join(dirname(filePath), "resized-images");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir);
  }
  const outputPath = join(outputDir, basename(filePath));
  const outputFileStream = createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    resResized.body?.pipe(outputFileStream);
    resResized.body?.on("error", reject);
    outputFileStream.on("finish", resolve);
  });

  return [
    {
      originalSize: size,
      compressedSize: resJson.output.size,
    },
  ];
};
