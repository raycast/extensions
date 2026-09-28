import { environment, getApplications, LaunchProps, open, showHUD, showToast, Toast } from "@raycast/api";
import { Connection, getStatus, saveConnection } from "./api/client";
import { AKTAR_BUNDLE_ID, AKTAR_DOWNLOAD_URL, showAktarFailure } from "./lib/errors";

type LaunchContext = {
  /** Sent back by Aktar through a deeplink once the user approves the connection. */
  aktar?: Connection;
};

/**
 * Pairing is a round trip: this command opens aktar://connect with a
 * deeplink back to itself, Aktar asks the user to approve, then reopens
 * this command with the port and token as launch context.
 */
export default async function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const handedOver = props.launchContext?.aktar;
  if (handedOver?.token && handedOver.port) {
    await finishPairing(handedOver);
    return;
  }

  const applications = await getApplications();
  if (!applications.some((application) => application.bundleId === AKTAR_BUNDLE_ID)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Aktar isn't installed",
      message: "Install the Aktar menu bar app first.",
      primaryAction: { title: "Download Aktar", onAction: () => open(AKTAR_DOWNLOAD_URL) },
    });
    return;
  }

  const callback = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${environment.commandName}`;
  await open(`aktar://connect?callback=${encodeURIComponent(callback)}`);
  await showHUD("Approve the connection in Aktar");
}

async function finishPairing(connection: Connection) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Aktar" });
  // Aktar may still be starting its local API right after the approval.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const status = await getStatus(connection);
      await saveConnection(connection);
      toast.style = Toast.Style.Success;
      toast.title = "Connected to Aktar";
      toast.message = `Aktar ${status.version}`;
      return;
    } catch (error) {
      if (attempt === 9) {
        await showAktarFailure(error, "Couldn't connect to Aktar");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
