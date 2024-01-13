import { runAppleScript } from "run-applescript";
import { confirmAlert, Alert, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { getActiveApplications } from "./lib/active-apps";
import { closeAllApplicationsAppleScript } from "./lib/apple-scripts";

export default async function CloseAllApplications() {
  const activeApplications = await getActiveApplications();

  const options: Alert.Options = {
    title: "Close All Applications",
    message: "Close all open applications.",
    primaryAction: {
      title: "Confirm",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        try {
          const names = activeApplications.map(({ name }) => name);
          await runAppleScript(closeAllApplicationsAppleScript(names));
        } catch (e) {
          console.error(`closeAllApplications -> ${e}`);
          showFailureToast({ error: `Sorry, couldn't close all app. Please try again` });
        }
      },
    },
  };

  if (await confirmAlert(options)) {
    await showHUD("Closed all apps");
  } else {
    await showHUD("Canceled!");
  }
}
