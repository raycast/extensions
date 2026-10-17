import { open, showHUD, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";
import { availablePaths, creditsNote, selectedImagePath, showError, showProgress } from "./lib/command";
import { readImageAsDataUrl } from "./lib/image";
import { svgText, vectorize } from "./lib/svgnew";

export default async function Command() {
  try {
    const filePath = await selectedImagePath();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading image…",
      message: path.basename(filePath),
    });

    const image = await readImageAsDataUrl(filePath);
    toast.title = "Vectorizing…";
    toast.message = undefined;
    const result = await vectorize(image, { onProgress: showProgress(toast, "Vectorizing…") });

    toast.title = "Saving SVG…";
    toast.message = undefined;
    const svg = await svgText(result);
    const [outputPath] = availablePaths(path.dirname(filePath), path.parse(filePath).name, [".svg"]);
    await fs.writeFile(outputPath, svg);

    await showHUD(`Saved ${path.basename(outputPath)}${creditsNote(result.creditsRemaining)}`);
    await open(outputPath);
  } catch (error) {
    await showError(error, "Could not convert image");
  }
}
