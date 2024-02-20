import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Pin }>) {
  let url = "cleanshot://pin";

  if (props?.arguments?.filepath) {
    url += `?filepath=${encodeURIComponent(props.arguments.filepath)}`;
  }

  await closeMainWindow();
  open(url);
}
