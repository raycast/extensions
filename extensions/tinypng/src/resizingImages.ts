import { statSync, createReadStream, createWriteStream } from "node:fs";
import { showToast, Toast, getSelectedFinderItems, getPreferenceValues, showHUD } from "@raycast/api";
import fetch from "node-fetch";
import { compressImageResponseScheme } from "./lib/zodSchema";
import { filterSupportedImagePaths, isMacOS, resolveOutputFile } from "./lib/utils";
import { showFailureToast } from "@raycast/utils";

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
    title: `Resizing ${filePaths.length} ${isSingleFile ? "image" : "images"}...`,
  });

  try {
    const results = await Promise.all(
      filePaths.map((filePath) => _compressAndResizeImage(filePath, isSingleFile, props)),
    );
    const totalOriginalSize = results.reduce((acc, cur) => acc + cur[0].originalSize, 0);
    const totalCompressedSize = results.reduce((acc, cur) => acc + cur[0].compressedSize, 0);

    await showHUD(`Resizing successful 🎉  (-${(100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%)`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = error instanceof Error ? error.message : "failed to compress images";
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
  isSingleFile: boolean,
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

  // Save resized image
  const outputPath = resolveOutputFile(filePath, {
    destinationFolderPath: preferences.resizeDestinationFolderPath,
    overwrite: preferences.overwrite,
    isSingleFile: preferences.saveSingleFileNextToOriginal && isSingleFile,
    suffix: "-resized",
  });

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
