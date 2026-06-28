import { useState, useEffect, useRef } from "react";
import { Toast, showToast } from "@raycast/api";
import { isRequiredCliInstalled, ensureCLI } from "../services/cliManager";

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
      const installed = await isRequiredCliInstalled();
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
          toast.title = "Word4You CLI downloaded";
          setCliInstalled(true);
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to download Word4You CLI";
          console.error("Error downloading Word4You CLI:", error);
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
