import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isMissingDependency } from "./lib/dependencies";
import { openCommand } from "./lib/launch";
import { getStatus, toggleProxy } from "./lib/mitm";

export default async function command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling mitmproxy…",
  });

  try {
    const performed = await toggleProxy();
    if (!performed) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cancelled";
      return;
    }

    const after = await getStatus();
    toast.style = Toast.Style.Success;
    toast.title = after.running ? "mitmproxy on" : "mitmproxy off";
    toast.message = after.running ? (after.service ?? undefined) : undefined;
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, {
      title: "mitm failed",
      primaryAction:
        error instanceof Error && isMissingDependency(error)
          ? {
              title: "Set Up MITM Proxy",
              onAction: () =>
                openCommand("setup", "Could not open Set Up MITM Proxy"),
            }
          : undefined,
    });
  }
}
