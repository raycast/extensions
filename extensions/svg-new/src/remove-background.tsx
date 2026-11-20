import { open, showHUD, showToast, Toast } from "@raycast/api";
import path from "path";
import { outputDir, savedWhere, saveResult, selectedImagePath, showError, showProgress } from "./lib/command";
import { readImageAsDataUrl } from "./lib/image";
import { download, removeBackground, svgText, vectorize } from "./lib/svgnew";

export default async function Command() {
  try {
    const filePath = await selectedImagePath();
    const dir = await outputDir(filePath);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading image…",
      message: path.basename(filePath),
    });

    const image = await readImageAsDataUrl(filePath);

    // The API removes backgrounds from an SVG using the original image, so vectorize first.
    toast.title = "Vectorizing…";
    toast.message = undefined;
    const vector = await vectorize(image, { link: true, onProgress: showProgress(toast, "Vectorizing…") });

    toast.title = "Removing background…";
    toast.message = undefined;
    const result = await removeBackground(image, vector);

    toast.title = "Saving files…";
    const png = result.png ?? (await download(result.pngUrl as string));
    const svg = await svgText(result);
    const name = `${path.parse(filePath).name}-no-bg`;
    const saved = await saveResult(dir, name, [
      { ext: ".png", data: png },
      { ext: ".svg", data: svg },
    ]);
    const [pngPath, svgPath] = saved.paths;

    await showHUD(`Saved ${path.basename(pngPath)} and ${path.basename(svgPath)}${savedWhere(filePath, saved.dir)}`);
    await open(pngPath);
  } catch (error) {
    await showError(error, "Could not remove background");
  }
}
