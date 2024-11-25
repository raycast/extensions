import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { networkInterfaces } from "os";

export default async function Command() {
  const ipv6Address = Object.values(networkInterfaces())
    .flat()
    .find((iface) => iface?.family === "IPv6" && !iface.internal)?.address;

  if (!ipv6Address) {
    await showFailureToast("No IPv6 address found");
    return;
  }

  await Clipboard.copy(ipv6Address);
  await showHUD(`Copied ${ipv6Address} to clipboard`);
  await closeMainWindow();
}
