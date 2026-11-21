import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

export async function refreshMenuBar() {
  // The menu bar reads the snapshot the mutation just saved, so this costs no request.
  // It throws when the menu-bar command isn't enabled; a refresh must never turn a
  // successful timer mutation into an apparent failure.
  await launchCommand({ name: "menu-bar", type: LaunchType.Background }).catch(
    () => undefined,
  );
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try refreshing.";
}
export async function notifyError(title: string, error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: message(error),
  });
}
export function launch(name: string, context?: Record<string, unknown>) {
  return launchCommand({ name, type: LaunchType.UserInitiated, context });
}
