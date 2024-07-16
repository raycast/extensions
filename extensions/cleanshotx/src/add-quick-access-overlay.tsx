import { LaunchProps, closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { getSelectedFinderPaths } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddQuickAccessOverlay }>) {
  const url = "cleanshot://add-quick-access-overlay";
  const filepaths = props.arguments?.filepath ? [props.arguments.filepath] : await getSelectedFinderPaths();

  if (filepaths.length === 0) {
    return showToast({
      style: Toast.Style.Failure,
      title: "No file selected",
      message: "Provide a file path or select a file in Finder",
    });
  }
  await closeMainWindow();
  filepaths.forEach((filepath) => open(`${url}?filepath=${encodeURIComponent(filepath)}`));
}
