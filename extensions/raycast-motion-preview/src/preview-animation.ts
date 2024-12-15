import { getFocusFinderPath, hasExt } from "./lib/util";
import { showHUD } from "@raycast/api";
import { isValidLottie } from "./lib/is-valid-lottie";
import { previewFile } from "swift:../swift/motion-preview";

const PreviewLottieJson = async () => {
  const currentFile = await getFocusFinderPath();
  if (!currentFile) {
    await showHUD("No file selected");
    return;
  }

  if (!hasExt(currentFile, ["lottie", "json", "riv"])) {
    await showHUD("Unsupported file format");
    return;
  }

  try {
    if (hasExt(currentFile, "json")) {
      const lottieValid = await isValidLottie(currentFile);

      if (!lottieValid) {
        await showHUD("Invalid Lottie JSON file");
        return;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
      return;
    }
    await showHUD("Invalid Lottie JSON file");
    return;
  }

  try {
    await previewFile(currentFile);
  } catch (e) {
    console.log(e);
    //
  }
};

export default PreviewLottieJson;
