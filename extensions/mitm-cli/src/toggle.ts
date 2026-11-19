import { showToast, Toast } from "@raycast/api";
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
    toast.style = Toast.Style.Failure;
    toast.title = "mitm failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
