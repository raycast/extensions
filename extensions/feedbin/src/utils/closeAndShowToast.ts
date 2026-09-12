import { closeMainWindow, popToRoot, showToast } from "@raycast/api";

export async function closeAndShowToast(...args: Parameters<typeof showToast>) {
  await closeMainWindow();
  await popToRoot();
  return showToast(...args);
}
