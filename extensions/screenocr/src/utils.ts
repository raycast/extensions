import { environment } from "@raycast/api";
import { join } from "path";
import { execa, ExecaError } from "execa";
import { chmod } from "fs/promises";
import { getUserSelectedLanguages, usePreferences } from "./hooks";

const recognizeText = async (isFullScreen = false) => {
  const preference = usePreferences();
  const command = join(environment.assetsPath, "recognize-text");
  await chmod(command, "755");

  try {
    const languages = await getUserSelectedLanguages();

    const args: string[] = [];

    if (isFullScreen) {
      args.push("--fullscreen");
    }

    if (preference.languageCorrection) {
      args.push("--languagecorrection");
    }

    if (preference.ocrMode === "fast") {
      args.push("--fast");
    }

    args.push("--languages");
    args.push(languages.map((lang) => lang.value).join(" "));

    const { stdout } = await execa(command, args);
    return stdout;
  } catch (error) {
    if ((error as ExecaError).stdout === "No text selected") {
      return undefined;
    } else {
      throw error;
    }
  }
};

export { recognizeText };
