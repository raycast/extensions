import { Toast, open, showToast } from "@raycast/api";
import { Daytona } from "@daytona/sdk";
import { createDaytonaClient, getDaytonaErrorMessage } from "./daytona-client";
import { getDashboardUrl } from "./dashboard-url";
import { getDaytonaPreferences } from "./daytona-preferences";

export async function startDaytonaAnimatedToast(title: string): Promise<{
  preferences: Preferences;
  daytona: Daytona;
  toast: Toast;
}> {
  const preferences = getDaytonaPreferences();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title,
  });

  return { preferences, daytona: createDaytonaClient(preferences), toast };
}

export function setToastFailure(toast: Toast, title: string, error: unknown): void {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = getDaytonaErrorMessage(error);
}

export function setSandboxCreatedToast(
  toast: Toast,
  preferences: Preferences,
  sandbox: { id: string; name?: string },
  message?: string,
): void {
  toast.style = Toast.Style.Success;
  toast.title = "Sandbox created";
  toast.message = message ?? `${sandbox.name} (${sandbox.id})`;
  toast.primaryAction = {
    title: "Open in Dashboard",
    onAction: () => open(getDashboardUrl(preferences.apiUrl, `sandboxes?sandboxId=${sandbox.id}`)),
  };
}
