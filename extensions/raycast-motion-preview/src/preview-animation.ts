import { getFocusFinderPath, hasExt } from "./lib/util";
import { chmodSync } from "node:fs";
import { environment, showHUD } from "@raycast/api";
import { join } from "node:path";
import { execa } from "execa";
import { isValidLottie } from "./lib/is-valid-lottie";

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

  const command = join(environment.assetsPath, "bin/rc-motion-preview");
  chmodSync(command, 0o755);
  execa(command, [currentFile]);
};

export default PreviewLottieJson;
