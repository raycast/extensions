import { Clipboard, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { Daytona, DaytonaError } from "@daytona/sdk";

export default async function InstantSandboxCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const target = preferences.target && preferences.target !== "auto" ? preferences.target : undefined;
  const apiUrl = preferences.apiUrl?.trim() || undefined;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating instant sandbox",
  });

  try {
    const daytona = new Daytona({
      apiKey: preferences.apiKey,
      apiUrl,
      target,
    });

    const sandbox = await daytona.create();

    await Clipboard.copy(sandbox.id);

    toast.style = Toast.Style.Success;
    toast.title = "Sandbox created";
    toast.message = `ID copied: ${sandbox.id}`;
    toast.primaryAction = {
      title: "Open in Dashboard",
      onAction: () => open(`https://app.daytona.io/dashboard/sandboxes?sandboxId=${sandbox.id}`),
    };
  } catch (error) {
    const message = error instanceof DaytonaError || error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Instant sandbox failed";
    toast.message = message;
  }
}
