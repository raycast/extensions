import { writeFileSync } from "fs";
import path from "path";
import os from "os";
import { getPreferenceValues, showInFinder, showHUD, Clipboard } from "@raycast/api";

export function writeContentToFile(content: string): string {
  const fileName = getPreferenceValues<ExtensionPreferences>().fileName;
  let directory = getPreferenceValues<ExtensionPreferences>().fileDirectory;

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
  getText: () => Promise<string | undefined>,
  action: (fileContent: Clipboard.Content) => Promise<void>,
  successMessage: string = "File copied to clipboard",
): Promise<void> {
  try {
    const text = await getText();
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
    await showHUD("❌ Something went wrong");
  }
}
