import { writeFileSync } from "fs";
import path from "path";
import os from "os";
import { getPreferenceValues, showInFinder, showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export function writeContentToFile(content: string): string {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const fileName = preferences.fileName;
  let directory = preferences.fileDirectory;

  if (!directory || directory.trim() === "" || directory === "/") {
    directory = os.tmpdir();
  }

  const filePath = path.join(directory, fileName);

  writeFileSync(filePath, content, "utf-8");

  return filePath;
}

export async function maybeOpenFinder(filePath: string): Promise<void> {
  if (getPreferenceValues<ExtensionPreferences>().openInFinder) {
    await showInFinder(filePath);
  }
}

export async function handleTextToFile(
  text: string | undefined,
  action: (fileContent: Clipboard.Content) => Promise<void>,
  successMessage: string = "File copied to clipboard",
): Promise<void> {
  try {
    if (!text || text.trim() === "") {
      await showHUD("❌ No text found");
      return;
    }
    const filePath = writeContentToFile(text);
    const fileContent: Clipboard.Content = { file: filePath };

    await action(fileContent);
    await showHUD(`✅ ${successMessage}`);

    if (action === Clipboard.copy) {
      await maybeOpenFinder(filePath);
    }
  } catch (error) {
    console.error("Error handling text to file:", error);
    showFailureToast(error, { title: "Something went wrong" });
  }
}
