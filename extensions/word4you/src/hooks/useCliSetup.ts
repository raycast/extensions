import { useState, useEffect, useRef } from "react";
import { Toast, showToast } from "@raycast/api";
import { isCliInstalled, ensureCLI } from "../services/cliManager";
import { showFailureToast } from "@raycast/utils";

export function useCliSetup() {
  const [cliInstalled, setCliInstalled] = useState<boolean | undefined>();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Prevent duplicate executions
    if (hasChecked.current) {
      return;
    }
    hasChecked.current = true;

    const checkCliInstallation = async () => {
      const installed = isCliInstalled();
      setCliInstalled(installed);

      if (!installed) {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Downloading Word4You CLI",
        });

        try {
          // Try to download the CLI
          await ensureCLI();
          toast.style = Toast.Style.Success;
          toast.title = "Word4You CLI downloaded successfully";
          setCliInstalled(true);
        } catch (error) {
          showFailureToast(error, { title: "Failed to download Word4You CLI" });
          setCliInstalled(false);
        }
      }
    };

    checkCliInstallation();
  }, []);

  return {
    cliInstalled,
  };
}
