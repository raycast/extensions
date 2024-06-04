import { confirmAlert, LocalStorage, openExtensionPreferences } from "@raycast/api";
import { add_system_service } from "./getPreference";

export async function confirmAlertPersist() {
  console.log("add_system_service:" + add_system_service());
  if (add_system_service() === undefined && (await LocalStorage.getItem<string>("ConfirmedPersist")) !== "true") {
    await LocalStorage.setItem("ConfirmedPersist", "true");
    return confirmAlert({
      title: "Does it take effect after restart?",
      message:
        "Add a system service to ensure that the configuration takes effect after each restart\nClick YES to open Raycast Preferences to persist\nOr click Cancel to not persist",
      primaryAction: {
        title: "Yes",
        onAction: () => {
          openExtensionPreferences();
        },
      },
    });
  }
}
