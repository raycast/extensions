import { getIPV4Address } from "./utils/common-utils";
import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  const ipv4 = getIPV4Address();
  if (typeof ipv4 === "string") {
    await Clipboard.copy(`${ipv4}`);
    await showHUD("IP address " + ipv4 + " copied to clipboard");
  } else {
    await showHUD("Failed to get IP address");
  }
};
