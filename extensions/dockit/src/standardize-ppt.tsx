import { showHUD, showToast, Toast, open } from "@raycast/api";
import { runDockit, getFinderSelection } from "./utils/run-dockit";
import path from "path";

export default async function Command() {
  // Get selected file from Finder
  let selectedFile: string;
  try {
    selectedFile = getFinderSelection();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected",
      message: "Please select a .pptx file in Finder",
    });
    return;
  }

  if (!selectedFile.endsWith(".pptx")) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid file",
      message: "Please select a .pptx file",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Standardizing...",
    message: path.basename(selectedFile),
  });

  const result = await runDockit(["standardize-ppt", selectedFile]);

  if (!result.success) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Standardize failed",
      message:
        result.error ||
        "Unknown error. Is dockit installed? (pip install dockit)",
    });
    return;
  }

  const stats = result.output as Record<string, unknown>;
  const parts: string[] = [];
  if (stats.fonts_unified) parts.push("fonts unified");
  if (stats.text_fixed) parts.push("text fixed");
  if (stats.tables_styled) parts.push("tables styled");
  const summary = parts.length > 0 ? parts.join(", ") : "done";

  await showHUD(`Done: ${summary}`);

  // Reveal output file directory in Finder
  const outputFile = selectedFile.replace(".pptx", "_formatted.pptx");
  await open(path.dirname(outputFile), "Finder");
}
