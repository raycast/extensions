import { showHUD, showToast, Toast, open, LaunchProps } from "@raycast/api";
import { runDockit, getFinderSelection } from "./utils/run-dockit";
import path from "path";

const SUPPORTED_INPUT_EXTENSIONS = [".xlsx", ".xls", ".csv", ".txt"];

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.ConvertFormat }>,
) {
  const targetFormat = props.arguments.format;

  // Get selected file from Finder
  let selectedFile: string;
  try {
    selectedFile = getFinderSelection();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected",
      message: "Please select a spreadsheet file in Finder",
    });
    return;
  }

  const ext = path.extname(selectedFile).toLowerCase();
  if (!SUPPORTED_INPUT_EXTENSIONS.includes(ext)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid file",
      message: `Please select a spreadsheet file (${SUPPORTED_INPUT_EXTENSIONS.join(", ")})`,
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Converting...",
    message: `${path.basename(selectedFile)} -> ${targetFormat.toUpperCase()}`,
  });

  const result = await runDockit([
    "convert",
    selectedFile,
    "--to",
    targetFormat,
  ]);

  if (!result.success) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message:
        result.error ||
        "Unknown error. Is dockit installed? (pip install dockit)",
    });
    return;
  }

  const stats = result.output as Record<string, unknown>;
  const rows = stats.rows ? ` (${stats.rows} rows)` : "";

  await showHUD(`Converted to ${targetFormat.toUpperCase()}${rows}`);

  // Reveal output file directory in Finder
  await open(path.dirname(selectedFile), "Finder");
}
