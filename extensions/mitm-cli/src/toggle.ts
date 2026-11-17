import { confirmAlert, showToast, Toast } from "@raycast/api";
import { getStatus, runMitm } from "./lib/mitm";

export default async function command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling mitmproxy…",
  });

  try {
    const before = await getStatus();

    if (!before.running && !before.ca) {
      const confirmed = await confirmAlert({
        title: "Trust the mitmproxy root CA?",
        message:
          "mitmproxy decrypts HTTPS with its own certificate authority. Continuing trusts that CA in your login keychain; `mitm untrust` removes it again.",
        primaryAction: { title: "Trust and Start" },
      });
      if (!confirmed) {
        toast.style = Toast.Style.Failure;
        toast.title = "Cancelled";
        return;
      }
    }

    await runMitm(["toggle"]);
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
