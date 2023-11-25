import { Clipboard, environment, LaunchType, Toast, updateCommandMetadata } from "@raycast/api";

const command = async () => {
  const now = new Date();

  const kentucky = now.toLocaleString(undefined, { timeZone: "America/Kentucky/Louisville", timeStyle: "short" });
  const netherlands = now.toLocaleString(undefined, { timeZone: "Europe/Amsterdam", timeStyle: "short" });
  const australia = now.toLocaleString(undefined, { timeZone: "Australia/Melbourne", timeStyle: "short" });
  
  const subtitle = `🇺🇸 ${kentucky}   🇳🇱 ${netherlands}   🇦🇺 ${australia}`;
  await updateCommandMetadata({ subtitle });

  if (environment.launchType === LaunchType.UserInitiated) {
    const toast = new Toast({
      style: Toast.Style.Success,
      title: "Refreshed!",
      message: subtitle,
    });
    toast.primaryAction = {
      title: "Copy to Clipboard",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(subtitle),
    };
    await toast.show();
  }
};

export default command;
