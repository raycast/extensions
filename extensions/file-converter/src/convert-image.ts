import {
  showToast,
  Toast,
  getSelectedFinderItems,
  showHUD,
  open,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import { buildOutputPath, findBinary } from "./utils";

const execFileAsync = promisify(execFile);

const IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "avif",
  "heic",
  "svg",
  "webp",
  "ico",
]);

export async function convertFinderImageTo(
  targetExt: string,
  label: string,
): Promise<void> {
  let items;
  try {
    items = await getSelectedFinderItems();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected in Finder",
    });
    return;
  }

  const valid = items.filter((i) =>
    IMAGE_EXTS.has(path.extname(i.path).replace(".", "").toLowerCase()),
  );

  if (!valid.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No compatible image selected",
    });
    return;
  }

  let magickBin: string;
  try {
    magickBin = findBinary("magick");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "ImageMagick not found",
      message: "Install it with: brew install imagemagick",
    });
    return;
  }

  const icoArgs =
    targetExt === "ico"
      ? ["-define", "icon:auto-resize=256,128,64,48,32,16"]
      : [];
  let converted = 0;
  let lastDir = "";

  for (const item of valid) {
    const outputPath = buildOutputPath(item.path, targetExt);
    await showToast({
      style: Toast.Style.Animated,
      title: `Converting to ${label}… (${converted + 1}/${valid.length})`,
    });

    try {
      await execFileAsync(magickBin, [item.path, ...icoArgs, outputPath], {
        timeout: 60_000,
      });
      if (fs.existsSync(outputPath)) {
        converted++;
        lastDir = path.dirname(outputPath);
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Error converting ${path.basename(item.path)}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (converted > 0) {
    await showHUD(
      `✅ ${converted} file${converted > 1 ? "s" : ""} converted to ${label}`,
    );
    await open(lastDir);
  }
}
