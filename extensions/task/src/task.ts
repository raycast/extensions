import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { startMenuBar } from "./native-menu-bar";
import { readSession, saveSession } from "./session";
import { resolveTaskLaunch } from "./task-launch";

export default async function Command(props: LaunchProps<{ arguments: { task: string; minutes: string } }>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Starting task" });
  try {
    const current = await readSession();
    const resolved = resolveTaskLaunch(current, props.arguments);
    if (!resolved.session) throw new Error("Enter a task name and duration.");
    // Wait for the native status item to be created before reporting success.
    // If compilation or startup fails, no new running session is saved.
    await startMenuBar(resolved.session);
    if (resolved.created) await saveSession(resolved.session);
    await toast.hide();
    if (resolved.message) {
      await showHUD(
        `${resolved.session.status === "paused" ? "Paused" : "Running"}: ${resolved.session.taskName} (timer restored)`,
      );
    } else {
      await showHUD(`Started: ${resolved.session.taskName} · ${resolved.session.durationMinutes} min`);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not start task";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
