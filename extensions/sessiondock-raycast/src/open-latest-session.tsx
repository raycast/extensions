import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { focusSession, listSessions, openSessionProject } from "./api";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Looking up latest session",
  });

  try {
    const sessions = await listSessions({ limit: 1 });
    const latest = sessions[0];

    if (!latest) {
      toast.style = Toast.Style.Failure;
      toast.title = "No sessions found";
      return;
    }

    try {
      await focusSession(latest.id);
    } catch {
      await openSessionProject(latest.id);
    }

    toast.style = Toast.Style.Success;
    toast.title = `Opened ${latest.title}`;
    await closeMainWindow();
    await showHUD(`Opened latest: ${latest.title}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof Error ? error.message : "Failed to open latest session";
  }
}
