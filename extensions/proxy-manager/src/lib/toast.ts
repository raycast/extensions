import { Alert, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { errorMessage, isNotRunning, launchApp } from "./control";

/** Failure toast that offers the one action which unblocks the common cause. */
export async function reportFailure(error: unknown, title: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Failure,
    title,
    message: errorMessage(error),
  });
  if (isNotRunning(error)) {
    toast.primaryAction = {
      title: "Open Proxy Manager",
      onAction: () => {
        void launchApp();
      },
    };
  }
}

export async function confirmDestructive(options: {
  title: string;
  message: string;
  actionTitle: string;
}): Promise<boolean> {
  return confirmAlert({
    icon: { source: Icon.Trash, tintColor: Color.Red },
    title: options.title,
    message: options.message,
    primaryAction: { title: options.actionTitle, style: Alert.ActionStyle.Destructive },
  });
}
