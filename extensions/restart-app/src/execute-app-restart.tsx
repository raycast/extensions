import { popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { restartMultipleApps } from "./app-utils";
import { getAppConfigs, migrateConfigsIfNeeded } from "./storage";

interface CommandArguments {
  configId?: string;
}

export default function Command(props: { arguments: CommandArguments }) {
  const configId = props.arguments.configId;

  useEffect(() => {
    async function executeRestart() {
      try {
        // First, migrate configs if needed
        await migrateConfigsIfNeeded();

        if (!configId) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Missing configuration ID",
          });
          setTimeout(() => popToRoot(), 1500);
          return;
        }

        // Get all configs
        const configs = await getAppConfigs();

        // Find the matching config
        const configToRun = configs.find((config) => config.id === configId);

        if (!configToRun) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Configuration not found",
            message: `No configuration found with ID: ${configId}`,
          });
          setTimeout(() => popToRoot(), 1500);
          return;
        }

        // Show the start toast
        await showToast({
          style: Toast.Style.Animated,
          title: `Restarting apps in ${configToRun.name}`,
        });

        // Restart all apps in the configuration
        await restartMultipleApps(configToRun.apps);

        // Show success toast
        await showToast({
          style: Toast.Style.Success,
          title: `Restarted all apps in ${configToRun.name}`,
        });

        // Return to Raycast root
        setTimeout(() => popToRoot(), 1500);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to restart apps",
          message: String(error),
        });
        setTimeout(() => popToRoot(), 1500);
      }
    }

    executeRestart();
  }, [configId]);

  // Return null since we don't need to render anything
  return null;
}
