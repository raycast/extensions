import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddQuickAccessOverlay }>) {
  let url = "cleanshot://add-quick-access-overlay";

  url += `?filepath=${encodeURIComponent(props.arguments.filepath)}`;

  await closeMainWindow();
  open(url);
}
