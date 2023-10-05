import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Annotate }>) {
  let url = "cleanshot://open-annotate";

  if (props?.arguments?.filepath) {
    url += `?filepath=${encodeURIComponent(props.arguments.filepath)}`;
  }

  await closeMainWindow();
  open(url);
}
