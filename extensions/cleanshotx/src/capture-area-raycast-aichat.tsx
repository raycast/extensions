import { AI, closeMainWindow, environment, open, showToast } from "@raycast/api";

export default async function Command() {
  if (!environment.canAccess(AI)) {
    await showToast({ title: "Command requires Pro subscription" });
    return;
  }

  const url = "cleanshot://capture-area-raycast-aichat";
  await closeMainWindow();
  open(url);
}
