import { existsSync } from "fs";
import { mkdirSync } from "fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD } from "@raycast/api";
import { statSync, createReadStream, createWriteStream } from "fs";
import fetch from "node-fetch";
import { dirname, basename, join, extname } from "path";
import { compressImageResponseScheme } from "./lib/zodSchema";
import { resolveOutputPath } from "./lib/utils";

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
  if (args.method === "scale") {
    if (!(args.width || args.height)) {
      throw new Error("Width or height are required for scale method");
    }
    if (args.width && args.height) {
      throw new Error("You cannot specify both width and height for scale method. Only specify one of them");
    }
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
  props: Props,
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

  // Resize object that is sent to the API. The width and height are optional in case of the scale method, otherwise they will both be filled.
  const resize: { method: string; width?: number; height?: number } = {
    method: props.arguments.method,
  };
  if (props.arguments.width) {
    resize.width = Number(props.arguments.width);
  }
  if (props.arguments.height) {
    resize.height = Number(props.arguments.height);
  }

  const resResized = await fetch(downloadUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${preferences.apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resize,
    }),
  });

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
    outputPath = join(outputDir, `${basename(filePath, ext)}.resized${ext}`);
  }

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
