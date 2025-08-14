import { Action, Icon, Keyboard } from "@raycast/api";
import TrackNewDeliveryView from "./TrackNewDeliveryView";
import { Delivery } from "../delivery";

export default function TrackNewDeliveryAction({
  deliveries,
  setDeliveries,
  isLoading,
}: {
  deliveries?: Delivery[];
  setDeliveries: (value: Delivery[]) => Promise<void>;
  isLoading: boolean;
}) {
  return (
    <Action.Push
      title="Track New Delivery"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<TrackNewDeliveryView deliveries={deliveries} setDeliveries={setDeliveries} isLoading={isLoading} />}
    />
  );
}
