import { closeMainWindow, popToRoot, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getErrorDetails, tailscale, getStatus, sleep } from "./shared";

export default async function Connect() {
  let subtitle: string;
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Connecting",
    });

    await updateCommandMetadata({ subtitle: "" });

    popToRoot();
    closeMainWindow();
    tailscale("up");

    await sleep(2000); // `up` can take some time to complete, checking status before it's done can report the device is still offline

    const data = getStatus(false);
    const magicDNSSuffix = data.MagicDNSSuffix;

    subtitle = `Connected on ${magicDNSSuffix}`;
    showHUD(subtitle);
  } catch (err) {
    console.error(err);
    subtitle = getErrorDetails(err, "").title;
    showHUD(`Unable to connect: ${subtitle}`);
  }
  await updateCommandMetadata({ subtitle });
}
