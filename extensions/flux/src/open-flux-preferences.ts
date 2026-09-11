import { closeMainWindow, showToast } from "@raycast/api";
import { openPreferences } from "./flux-api";
import { DEFAULT_ERROR_TOAST } from "./constants";

export default async function OpenFluxPreferences() {
  await closeMainWindow();
  const success = await openPreferences();

  await showToast(success ? { title: "f.lux preferences opened" } : DEFAULT_ERROR_TOAST);
}
