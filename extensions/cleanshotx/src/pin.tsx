import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { getSelectedFinderPaths } from "./utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Pin }>) {
  const url = "cleanshot://pin";
  const filepaths = props.arguments?.filepath ? [props.arguments.filepath] : await getSelectedFinderPaths();

  await closeMainWindow();

  if (filepaths.length === 0) return open(url);
  filepaths.forEach((filepath) => open(`${url}?filepath=${encodeURIComponent(filepath)}`));
}
