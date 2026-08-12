import { Color, confirmAlert, Icon, showToast, Toast, Alert } from "@raycast/api";
import { clearAuthorsCache } from "./utils";

export default async function Command() {
  const confirmed = await confirmAlert({
    title: "Clear All Authors",
    message: "This will remove all imported co-authors. This action cannot be undone.",
    primaryAction: { title: "Clear Authors", style: Alert.ActionStyle.Destructive },
    icon: { source: Icon.RemovePerson, tintColor: Color.Red },
  });

  if (!confirmed) return;

  // Since there's no clean API for resetting frecency this action does not clear the ordering
  clearAuthorsCache();

  await showToast({ style: Toast.Style.Success, title: "All authors cleared" });
}
