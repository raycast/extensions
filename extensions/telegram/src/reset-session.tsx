import { useEffect } from "react";
import { Icon, List, showToast, Toast, popToRoot, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { resetSession } from "./services/telegram-client";

export default function ResetSession() {
  useEffect(() => {
    async function run() {
      const confirmed = await confirmAlert({
        title: "Reset Telegram Session",
        message: "This will clear all stored authentication data. You will need to re-authenticate.",
        icon: Icon.Trash,
        primaryAction: {
          title: "Reset Session",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        await popToRoot();
        return;
      }

      try {
        await resetSession();
        await showToast({
          style: Toast.Style.Success,
          title: "Session Reset",
          message: "Your Telegram session has been cleared. Run the authentication command to log in again.",
        });
      } catch (error) {
        await showFailureToast(error, { title: "Reset Failed" });
      } finally {
        await popToRoot();
      }
    }
    run();
  }, []);

  return <List isLoading />;
}
