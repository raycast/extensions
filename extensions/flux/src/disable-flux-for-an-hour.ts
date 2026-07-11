import { closeMainWindow, showToast } from "@raycast/api";
import { DisableDuration, disableFluxForDuration } from "./flux-api";
import { DEFAULT_ERROR_TOAST } from "./constants";

export default async function DisableHour() {
  await closeMainWindow();
  const success = await disableFluxForDuration(DisableDuration.ForAnHour);

  await showToast(success ? { title: "f.lux disabled for an hour" } : DEFAULT_ERROR_TOAST);
}
