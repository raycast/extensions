import { getIPV4Address } from "./utils/common-utils";
import { Clipboard, closeMainWindow, environment, LaunchType, showHUD, updateCommandMetadata } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  const ipv4 = getIPV4Address();
  if (environment.launchType === LaunchType.UserInitiated) {
    if (typeof ipv4 === "string") {
      await Clipboard.copy(`${ipv4}`);
      await showHUD("IP address " + ipv4 + " copied to clipboard");
    } else {
      await showHUD("Failed to get IP address");
    }
  }

  await updateCommandMetadata({ subtitle: `Local IP ${ipv4}` });
};
