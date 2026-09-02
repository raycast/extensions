import { Alert, Icon, Toast, closeMainWindow, confirmAlert, showToast } from "@raycast/api";

import { createMacOSParallelsHost } from "./internal/parallels-host";
import { errorMessage } from "./presentation";

export default async function ShutdownCommand(): Promise<void> {
  const confirmed = await confirmAlert({
    icon: Icon.Power,
    title: "Shut Down Parallels Desktop?",
    message:
      "This closes Parallels Desktop and shuts down its background services. Running virtual machines may be affected.",
    primaryAction: {
      title: "Shut Down",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Shutting Down Parallels…",
  });

  try {
    await closeMainWindow();
    await createMacOSParallelsHost().shutdown();
    toast.style = Toast.Style.Success;
    toast.title = "Parallels Shut Down";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Shut Down Parallels";
    toast.message = errorMessage(error);
  }
}
