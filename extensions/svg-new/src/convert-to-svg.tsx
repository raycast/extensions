import { open, showHUD, showToast, Toast } from "@raycast/api";
import path from "path";
import { creditsNote, saveNewFiles, selectedImagePath, showError, showProgress } from "./lib/command";
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
    const [outputPath] = await saveNewFiles(path.dirname(filePath), path.parse(filePath).name, [
      { ext: ".svg", data: svg },
    ]);

    await showHUD(`Saved ${path.basename(outputPath)}${creditsNote(result.creditsRemaining)}`);
    await open(outputPath);
  } catch (error) {
    await showError(error, "Could not convert image");
  }
}
