import { MenuBarExtra, open, Icon, Color } from "@raycast/api";
import { useDeliveries } from "./hooks/useDeliveries";
import { usePackages } from "./hooks/usePackages";
import { deliveryStatus } from "./package";
import { groupDeliveriesByStatus } from "./services/sortingService";
import carriers from "./carriers";

export default function MenuBarCommand() {
  const { activeDeliveries, isLoading } = useDeliveries();
  const { packages } = usePackages();

  const grouped = groupDeliveriesByStatus(activeDeliveries, packages);
  const totalInTransit = grouped.arrivingToday.length + grouped.inTransit.length;

  const menuBarTitle = totalInTransit > 0 ? `${totalInTransit}` : undefined;
  const menuBarIcon = totalInTransit > 0 ? { source: Icon.Box, tintColor: Color.Blue } : Icon.Box;

  return (
    <MenuBarExtra icon={menuBarIcon} title={menuBarTitle} isLoading={isLoading} tooltip="Delivery Tracker">
      {activeDeliveries.length === 0 ? (
        <MenuBarExtra.Item
          title="No Active Deliveries"
          onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-new-delivery")}
        />
      ) : (
        <>
          {grouped.arrivingToday.length > 0 && (
            <MenuBarExtra.Section title="Arriving Today">
              {grouped.arrivingToday.map((delivery) => {
                const carrier = carriers.get(delivery.carrier);
                return (
                  <MenuBarExtra.Item
                    key={delivery.id}
                    icon={carrier?.icon}
                    title={delivery.name}
                    subtitle={carrier?.name || "Unknown"}
                    onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                  />
                );
              })}
            </MenuBarExtra.Section>
          )}

          {grouped.inTransit.length > 0 && (
            <MenuBarExtra.Section title="In Transit">
              {grouped.inTransit.slice(0, 5).map((delivery) => {
                const status = deliveryStatus(packages[delivery.id]?.packages);
                const carrier = carriers.get(delivery.carrier);
                return (
                  <MenuBarExtra.Item
                    key={delivery.id}
                    icon={carrier?.icon}
                    title={delivery.name}
                    subtitle={status.value}
                    onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                  />
                );
              })}
              {grouped.inTransit.length > 5 && (
                <MenuBarExtra.Item
                  title={`+${grouped.inTransit.length - 5} more...`}
                  onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {grouped.delivered.length > 0 && (
            <MenuBarExtra.Section title="Recently Delivered">
              {grouped.delivered.slice(0, 3).map((delivery) => {
                const carrier = carriers.get(delivery.carrier);
                return (
                  <MenuBarExtra.Item
                    key={delivery.id}
                    icon={carrier?.icon}
                    title={delivery.name}
                    onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                  />
                );
              })}
            </MenuBarExtra.Section>
          )}
        </>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Track New Delivery"
          icon={Icon.Plus}
          onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-new-delivery")}
        />
        <MenuBarExtra.Item
          title="Open Delivery Tracker"
          icon={Icon.AppWindow}
          onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
