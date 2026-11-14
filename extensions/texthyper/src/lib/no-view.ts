// For commands without a view, which can't show the sign-in form themselves.

import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { getSession, SignedOutError } from "./api";

export async function ensureSignedIn(): Promise<boolean> {
  if (await getSession()) return true;
  await openAccount();
  return false;
}

async function openAccount() {
  await showToast({ style: Toast.Style.Failure, title: "Sign in to Texthyper first" });
  await run("account");
}

// Starts another of the extension's commands. A command the user disabled
// can't be started, which is said rather than thrown.
export async function run(name: string, type = LaunchType.UserInitiated) {
  try {
    await launchCommand({ name, type });
  } catch {
    if (type === LaunchType.UserInitiated) {
      await showToast({ style: Toast.Style.Failure, title: "That Texthyper command is turned off in Raycast" });
    }
  }
}

// The menu bar shows its last answer until it runs again: after signing in
// or out, that is now.
export function refreshMenuBar() {
  return run("menu-bar", LaunchType.Background);
}

export async function failed(toast: Toast, error: unknown, title: string) {
  if (error instanceof SignedOutError) {
    await toast.hide();
    await openAccount();
    return;
  }
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = error instanceof Error ? error.message : String(error);
}
