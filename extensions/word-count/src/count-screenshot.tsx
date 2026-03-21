import { closeMainWindow, showHUD, LaunchProps, LaunchType, open, confirmAlert, Icon } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";
import { count } from "./lib/count";

type LaunchContext = {
  text?: string;
  error?: string;
};

export default async function Command({ launchContext }: LaunchProps<{ launchContext?: LaunchContext }>) {
  // Callback from ScreenOCR with OCR result
  if (launchContext?.text !== undefined) {
    const text = launchContext.text.trim();

    if (!text) {
      await showHUD("❌ Nothing to count!");
      return;
    }

    const result = count(text, true);
    const number = (value: number) => value.toLocaleString();
    const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);

    const stats = [
      `${number(result.characters)} ${plural(result.characters, "char", "chars")}`,
      `${number(result.words)} ${plural(result.words, "word", "words")}`,
      `${number(result.sentences)} ${plural(result.sentences, "sentence", "sentences")}`,
      `${number(result.paragraphs)} ${plural(result.paragraphs, "paragraph", "paragraphs")}`,
    ];

    await showHUD(`📊 ${stats.join(" · ")}`);
    return;
  }

  // Error from ScreenOCR
  if (launchContext?.error) {
    await showHUD("❌ OCR failed!");
    return;
  }

  // Initial invocation: launch ScreenOCR
  if (process.platform === "win32") {
    await confirmAlert({
      title: "Not Supported on Windows",
      message:
        "Screenshot text recognition requires macOS. This feature uses the ScreenOCR extension which is not available on Windows.",
      icon: Icon.Warning,
      primaryAction: {
        title: "OK",
      },
    });
    return;
  }

  await closeMainWindow();

  try {
    await showHUD("🔍 Processing screenshot...");
    await crossLaunchCommand({
      name: "recognize-text",
      type: LaunchType.Background,
      extensionName: "screenocr",
      ownerOrAuthorName: "huzef44",
    });
  } catch {
    await showHUD("❌ Please install ScreenOCR extension");
    await open("raycast://extensions/huzef44/screenocr");
  }
}
