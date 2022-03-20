import { showHUD, Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isImagePath, isImageReference, convertFile } from "../utils/utils";

export const Convert = async () => {
  try {
    const text = await Clipboard.readText();

    if (!text) throw new Error("❌ There is no image in your clipboard. Copy an image or its path for conversion.");

    let newFile;
    if (isImageReference(text)) {
      const file = decodeURI(text).substring(7);
      newFile = await convertFile(file);
    } else if (isImagePath(text)) {
      newFile = await convertFile(text);
    } else {
      throw new Error(`The file doesn't seem like an image path or reference.`);
    }

    // ✨ Credit to @RSO - https://github.com/RSO, to use AppleScript to copy a file to the clipboard
    await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${newFile}" )`);
    await showHUD("✅ Image copied to clipboard!");
  } catch (error) {
    console.error(error);
    showHUD(error instanceof Error ? error.message : "Something went wrong");
  }
};
