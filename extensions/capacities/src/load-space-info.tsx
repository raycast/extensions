import { closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { useEffect } from "react";
import { loadAndSaveCapacitiesStore } from "./helpers/storage";

export default function Command() {
  async function loadInfo() {
    try {
      await loadAndSaveCapacitiesStore(true, true);
      showHUD("Info successfully updated.");
    } catch (e) {
      showHUD(e instanceof Error ? e.message : "Failed to load Capacities store.");
    }
  }

  useEffect(() => {
    loadInfo().then(() => popToRoot());
    closeMainWindow();
  }, []);

  return undefined;
}
