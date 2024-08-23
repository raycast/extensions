import { confirmAlert, LocalStorage, openExtensionPreferences } from "@raycast/api";
import { preferences } from "./getPreference";

export async function confirmAlertPersist() {
  const addSystemService = preferences.add_system_service;

  console.log("add_system_service: " + addSystemService);
  if (addSystemService === undefined && (await LocalStorage.getItem<string>("ConfirmedPersist")) !== "true") {
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
