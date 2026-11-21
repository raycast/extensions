import { getVpnStatus } from "./store";
import { LocalStorage, showHUD } from "@raycast/api";
import { getNetworkServices, isSessionGone, LAST_USED_KEY, setServiceStatus } from "./network-services";

export default async () => {
  try {
    const lastUsedName = await LocalStorage.getItem<string>(LAST_USED_KEY);
    if (!lastUsedName) {
      await showHUD('Choose a VPN in "Show Network Services" first');
      return;
    }

    const services = Object.values(await getNetworkServices());
    const service = services.find((service) => service.name === lastUsedName);
    if (!service) {
      await showHUD(`VPN "${lastUsedName}" was not found. Choose another in Show Network Services`);
      return;
    }
    if (service.status === "invalid") {
      await showHUD(`VPN "${service.name}" is unavailable. Check Network Settings`);
      return;
    }
    const update = await getVpnStatus();
    if (
      update?.serviceId === service.id &&
      Date.now() - update.timestamp >= 0 &&
      Date.now() - update.timestamp < 1_000 &&
      ((update.status === "connecting" && service.status === "disconnected") ||
        (update.status === "disconnecting" && service.status === "connected"))
    ) {
      service.status = update.status;
    }
    if (service.status === "connecting" || service.status === "disconnecting") {
      await showHUD(`${service.name} is already ${service.status}`);
      return;
    }

    const status = service.status === "connected" ? "disconnecting" : "connecting";
    await setServiceStatus(service, status);
    await showHUD(`${status === "connecting" ? "Connecting to" : "Disconnecting from"} ${service.name}`);
  } catch (err) {
    if (isSessionGone(err)) return;
    await showHUD(`Failed to toggle VPN: ${err instanceof Error ? err.message : String(err)}`).catch(() => undefined);
  }
};
