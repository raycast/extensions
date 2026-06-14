import {
  showToast,
  Toast,
  getSelectedFinderItems,
  showHUD,
  open,
} from "@raycast/api";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { buildOutputPath } from "./utils";

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
      title: "Aucun fichier sélectionné dans Finder",
    });
    return;
  }

  const valid = items.filter((i) =>
    IMAGE_EXTS.has(path.extname(i.path).replace(".", "").toLowerCase()),
  );

  if (!valid.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Aucune image compatible sélectionnée",
    });
    return;
  }

  const icoFlags =
    targetExt === "ico" ? "-define icon:auto-resize=256,128,64,48,32,16 " : "";
  let converted = 0;
  let lastDir = "";

  for (const item of valid) {
    const outputPath = buildOutputPath(item.path, targetExt);
    await showToast({
      style: Toast.Style.Animated,
      title: `Conversion en ${label}… (${converted + 1}/${valid.length})`,
    });

    try {
      execSync(
        `/opt/homebrew/bin/magick "${item.path}" ${icoFlags}"${outputPath}"`,
        { timeout: 60_000 },
      );
      if (fs.existsSync(outputPath)) {
        converted++;
        lastDir = path.dirname(outputPath);
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Erreur sur ${path.basename(item.path)}`,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (converted > 0) {
    await showHUD(
      `✅ ${converted} fichier${converted > 1 ? "s" : ""} converti${converted > 1 ? "s" : ""} en ${label}`,
    );
    await open(lastDir);
  }
}
