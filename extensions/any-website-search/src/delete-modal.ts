import { confirmAlert, Alert } from "@raycast/api";
import { SavedSitesState, updateSavedSites } from "./saved-sites";

export function showDeletionModal({
  savedSites,
  setSavedSites,
  title,
  index,
  pop,
}: SavedSitesState & { title: string; index: number; pop?: () => void }) {
  const titleToDelete = title ?? "";
  confirmAlert({
    title: `Really delete "${titleToDelete}"?`,
    message: `This action cannot be undone.`,
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
