import {
  LaunchProps,
  LaunchType,
  launchCommand,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { findConnection } from "./lib/connections";
import { openConnectionDeeplink } from "./lib/deeplink";
import { tableProInstalled } from "./lib/paths";

interface Args {
  connection: string;
}

export default async function OpenConnection(
  props: LaunchProps<{ arguments: Args }>,
) {
  const query = props.arguments.connection.trim();
  if (!query) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection name required",
    });
    return;
  }
  if (!tableProInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TablePro is not installed",
      message: "Install from tablepro.app",
      primaryAction: {
        title: "Open Website",
        onAction: () => {
          open("https://tablepro.app");
        },
      },
    });
    return;
  }
  const match = await findConnection(query);
  if (!match) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection not found",
      message: query,
      primaryAction: {
        title: "Search Connections",
        onAction: async () => {
          await launchCommand({
            name: "search-connections",
            type: LaunchType.UserInitiated,
          });
        },
      },
    });
    return;
  }
  try {
    await openConnectionDeeplink(match.id);
    await showHUD(`Opening ${match.name}`);
  } catch (err) {
    await showFailureToast(err, { title: "Could not open connection" });
  }
}
