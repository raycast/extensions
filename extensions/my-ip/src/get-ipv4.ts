import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { networkInterfaces } from "os";

export default async function Command() {
  const ipv4Address = Object.values(networkInterfaces())
    .flat()
    .find((iface) => iface?.family === "IPv4" && !iface.internal)?.address;

  if (!ipv4Address) {
    await showFailureToast("No IPv4 address found");
    return;
  }

  await Clipboard.copy(ipv4Address);
  await showHUD(`Copied ${ipv4Address} to clipboard`);
  await closeMainWindow();
}
