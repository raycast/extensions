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
      message: "Please select a .docx file in Finder",
    });
    return;
  }

  if (!selectedFile.endsWith(".docx")) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid file",
      message: "Please select a .docx file",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Formatting...",
    message: path.basename(selectedFile),
  });

  const result = await runDockit(["format-word", selectedFile]);

  if (!result.success) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Format failed",
      message:
        result.error ||
        "Unknown error. Is dockit installed? (pip install dockit)",
    });
    return;
  }

  const stats = result.output as Record<string, number>;
  const summary = Object.entries(stats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  await showHUD(`Done: ${summary}`);

  // Reveal output file directory in Finder
  const outputFile = selectedFile.replace(".docx", "_formatted.docx");
  await open(path.dirname(outputFile), "Finder");
}
