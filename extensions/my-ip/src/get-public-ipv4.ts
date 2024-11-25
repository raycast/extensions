import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";

export default async function Command() {
  let ipv4Address = "";

  try {
    ipv4Address = await fetch("https://api.ipify.org").then((response) => response.text());
  } catch (e) {
    console.error(e);
    await showFailureToast("Failed to fetch IPv4 address");
  }

  if (!ipv4Address) {
    await showFailureToast("No IPv4 address found");
    return;
  }

  await Clipboard.copy(ipv4Address);
  await showHUD(`Copied ${ipv4Address} to clipboard`);
  await closeMainWindow();
}
