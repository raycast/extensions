import { shouldPopToRoot } from "./prefs";
import { popToRoot, closeMainWindow } from "@raycast/api";

export function afterActionHandler(): void {
  if (shouldPopToRoot()) {
    closeMainWindow();
    popToRoot();
  }
}
