import { closeMainWindow, showToast } from "@raycast/api";
import { disableFluxForDuration } from "./flux-api";

export default async function DisableHour() {
  await closeMainWindow();
  await disableFluxForDuration("for an hour");
  await showToast({ title: "f.lux disabled for an hour" });
}
