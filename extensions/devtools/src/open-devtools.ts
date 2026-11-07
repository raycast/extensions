import { LaunchProps, closeMainWindow, showToast, Toast } from "@raycast/api";
import { DOWNLOAD_URL, SCHEME, isDevToolsInstalled, openLink, searchLink } from "./devtools";

export default async function OpenDevTools(props: LaunchProps<{ arguments: Arguments.OpenDevtools }>) {
  if (!(await isDevToolsInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "DevTools is not installed",
      primaryAction: { title: "Download DevTools", onAction: () => openLink(DOWNLOAD_URL) },
    });
    return;
  }
  const query = props.arguments.query?.trim() ?? "";
  try {
    await openLink(query ? searchLink(query) : `${SCHEME}://home`);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open DevTools",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
