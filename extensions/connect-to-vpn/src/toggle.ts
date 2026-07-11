import { LocalStorage, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import {
  getNetworkServices,
  LAST_USED_KEY,
  loadFavoriteOrder,
  loadFavorites,
  setServiceStatus,
} from "./network-services";

export default async () => {
  const lastUsedName = await LocalStorage.getItem(LAST_USED_KEY);
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Toggling ${lastUsedName}`,
    });

    const favs = await loadFavorites();
    const order = await loadFavoriteOrder();
    const networkServices = await getNetworkServices(favs, order);
    const ids = Object.keys(networkServices);
    const lastUsed = ids.find((id) => networkServices[id].name === lastUsedName);
    if (lastUsed) {
      const service = networkServices[lastUsed];
      if (service) {
        const status = networkServices[lastUsed].status;
        const newStatus = status === "connected" ? "disconnected" : "connecting";
        const newStatusMessage = status === "connected" ? "off" : "on";
        await setServiceStatus(service, newStatus);
        await showHUD(`Turned ${lastUsedName} ${newStatusMessage}`, {
          clearRootSearch: true,
          popToRootType: PopToRootType.Immediate,
        });
      }
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to toggle ${lastUsedName}`,
      message: String(err),
    });
  }
};
