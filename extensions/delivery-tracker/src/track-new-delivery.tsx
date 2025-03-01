import { environment } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Delivery } from "./delivery";
import { debugDeliveries } from "./debugData";
import TrackNewDeliveryView from "./views/TrackNewDeliveryView";

export default function TrackNewDeliveryCommand() {
  const {
    value: deliveries,
    setValue: setDeliveries,
    isLoading,
  } = useLocalStorage<Delivery[]>("deliveries", environment.isDevelopment ? debugDeliveries : []);

  return <TrackNewDeliveryView deliveries={deliveries} setDeliveries={setDeliveries} isLoading={isLoading} />;
}
