import { shouldPopToRoot } from "./prefs";
import { popToRoot } from "@raycast/api";

export function afterActionHandler(): void {
  if (shouldPopToRoot()) {
    popToRoot();
  }
}
