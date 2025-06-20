import { showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { refreshContacts } from "./contact";

export default function Command() {
  useEffect(() => {
    async function run() {
      await showToast({ style: Toast.Style.Animated, title: "Refreshing Contacts..." });

      try {
        await refreshContacts();
        await showToast({ style: Toast.Style.Success, title: "Contacts refreshed and cached!" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to refresh contacts" });
      }
    }

    run();
  }, []);

  return null;
}
