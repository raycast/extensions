import { confirmAlert, Alert } from "@raycast/api";
import { updateSavedSites } from "./saved-sites";
import { SavedSitesState } from "./types";

export function showDeletionModal({
  savedSites,
  setSavedSites,
  title,
  index,
  pop,
}: SavedSitesState & { title: string; index: number; pop?: () => void }) {
  confirmAlert({
    title: `Really delete "${title}"?`,
    message: "This action cannot be undone.",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction() {
        updateSavedSites({ savedSites, setSavedSites }, { type: "delete", index });
        if (pop) pop();
      },
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });
}
