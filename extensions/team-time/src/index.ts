import { Clipboard, environment, LaunchType, Toast, updateCommandMetadata } from "@raycast/api";

const command = async () => {
  const now = new Date();

  const oslo = now.toLocaleString(undefined, { timeZone: "Europe/Oslo", timeStyle: "short" });
  const tokyo = now.toLocaleString(undefined, { timeZone: "Asia/Tokyo", timeStyle: "short" });

  const subtitle = `🇯🇵 ${tokyo} 🇳🇴 ${oslo}`;
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
