import { getPreferenceValues, closeMainWindow } from "@raycast/api";
import { triggerScript } from "./utils";

export default async function Command() {
  const { closeWindow } = getPreferenceValues<{ closeWindow: boolean }>();
  const { toastBehavior } = getPreferenceValues<{ toastBehavior: string }>();

  if (closeWindow) await closeMainWindow();
  await triggerScript(toastBehavior);
}
