import { closeMainWindow, popToRoot, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getErrorDetails, tailscale } from "./shared";

export default async function Disconnect() {
  let subtitle: string;
  subtitle = "Tailscale";
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Disconnecting",
    });

    await updateCommandMetadata({ subtitle: "" });

    popToRoot();
    closeMainWindow();
    tailscale("down");

    showHUD(`Disconnected`);
  } catch (err) {
    console.error(err);
    subtitle = getErrorDetails(err, "").title;
    showHUD(`Unable to disconnect: ${subtitle}`);
  }
  await updateCommandMetadata({ subtitle });
}
