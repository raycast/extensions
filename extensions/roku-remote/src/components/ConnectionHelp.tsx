import { Detail } from "@raycast/api";
import { describeRokuError } from "../lib/roku";
import type { RokuDevice } from "../lib/types";

export function connectionMessage(cause: unknown) {
  return describeRokuError(cause);
}

export function ConnectionHelp({ device, message }: { device?: RokuDevice; message?: string }) {
  return (
    <Detail
      navigationTitle="Roku Connection Help"
      markdown={[
        device ? `# ${device.name}\n\nAddress: ${device.host}` : "# Connect to your Roku",
        message ?? "The Roku needs to be reachable on the same local network as your Mac.",
        "## Enable network control\n\nOn the Roku, open **Settings → System → Advanced system settings → Control by mobile apps → Network access** and choose **Enabled**. A Roku in **Limited** mode can answer some queries while refusing remote commands and the app list.",
        "## Check the connection\n\nKeep your Mac and Roku on the same network. Guest Wi-Fi, a VPN, or device isolation can stop discovery or control. If discovery misses the TV, find its address under **Settings → Network → About**, then add that address manually.",
        "A TV in standby may be unreachable. Wake it with its physical remote and try again. **Fast TV Start**, under **Settings → System → Power**, may help keep supported TVs reachable in standby.",
      ].join("\n\n")}
    />
  );
}
