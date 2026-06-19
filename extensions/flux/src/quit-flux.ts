import { closeMainWindow, showToast } from "@raycast/api";
import { quitFlux } from "./flux-api";
import { DEFAULT_ERROR_TOAST } from "./constants";

export default async function DisableHour() {
  await closeMainWindow();
  const success = await quitFlux();

  await showToast(success ? { title: "f.lux has quit" } : DEFAULT_ERROR_TOAST);
}
