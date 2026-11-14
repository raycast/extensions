import { closeMainWindow } from "@raycast/api";
import { runWithToast, showFailure } from "./feedback";
import { reconnectLastServer, smartDisconnect } from "./protonapp";
import { getService, getState } from "./vpn";

export default async function command() {
  await closeMainWindow();
  try {
    const service = await getService();
    const state = await getState(service.id);
    if (state === "Connected" || state === "Connecting") {
      await runWithToast("Disconnecting…", async () => {
        await smartDisconnect();
        return { title: "Proton VPN disconnected" };
      });
    } else {
      await runWithToast("Connecting…", async () => {
        await reconnectLastServer();
        return { title: "Proton VPN connected" };
      });
    }
  } catch (error) {
    await showFailure(
      "Could not reach Proton VPN",
      error instanceof Error ? error.message : String(error),
    );
  }
}
