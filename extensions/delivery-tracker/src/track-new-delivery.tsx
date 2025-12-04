import TrackNewDeliveryView from "./views/TrackNewDeliveryView";
import { useDeliveries } from "./hooks/useDeliveries";

export default function TrackNewDeliveryCommand() {
  const { activeDeliveries, setDeliveries, isLoading } = useDeliveries();

  return <TrackNewDeliveryView deliveries={activeDeliveries} setDeliveries={setDeliveries} isLoading={isLoading} />;
}
