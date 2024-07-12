import { getPreferenceValues, showHUD, Alert, confirmAlert } from "@raycast/api";
import fetch from "node-fetch";

export default async function endSession() {
  const options: Alert.Options = {
    title: "End Session?",
    message: "Are you sure you want to end the current session?",
    primaryAction: {
      title: "End Session",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        try {
          const response = await fetch(`https://hackhour.hackclub.com/api/end/${getPreferenceValues().userid}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getPreferenceValues().apiToken}`,
            },
          });

          if (response.ok) {
            showHUD("Session ended successfully!");
          } else {
            showHUD("Failed to end session");
          }
        } catch (error) {
          console.error("An error occurred", error);
        }
      },
    },
    dismissAction: {
      title: "Cancel",
    },
  };
  await confirmAlert(options);
}
