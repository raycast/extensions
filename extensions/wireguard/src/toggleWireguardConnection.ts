import { showToast, Toast, type LaunchProps } from "@raycast/api";
import getVPN from "./getVPN";
import toggle from "./toggle";

export default async function ToggleWireguardConnection({
  arguments: { sn },
}: LaunchProps<{
  arguments: Arguments.ToggleWireguardConnection;
}>) {
  const vpns = await getVPN();
  const vpn = vpns.find((vpn) => vpn.sn === sn);

  if (!vpn) {
    await showToast(Toast.Style.Failure, `Connection with Service Name ${sn} not found.`);
    return;
  }

  await toggle(vpn);
}
