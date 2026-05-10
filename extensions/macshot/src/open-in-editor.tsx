import {
  LaunchProps,
  Toast,
  closeMainWindow,
  open,
  showToast,
} from "@raycast/api";
import { getSelectedFinderPaths } from "./utils";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.OpenInEditor }>,
) {
  const filepaths = props.arguments?.filepath
    ? [props.arguments.filepath]
    : await getSelectedFinderPaths();

  if (filepaths.length === 0) {
    return showToast({
      style: Toast.Style.Failure,
      title: "No file selected",
      message: "Provide a file path or select an image in Finder",
    });
  }

  await closeMainWindow();

  await Promise.all(
    filepaths.map((filepath) =>
      open(`macshot://open?file=${encodeURIComponent(filepath)}`),
    ),
  );
}
