import { showFailureToast } from "@raycast/utils";
import { useEffect } from "react";
import { updateAllGlobalPackages } from "./lib/npm";

export default function UpgradeCommand() {
  useEffect(() => {
    async function runUpgrade() {
      try {
        await updateAllGlobalPackages();
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to upgrade global packages",
        });
      }
    }

    runUpgrade();
  }, []);

  return null;
}
