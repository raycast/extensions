import { MenuBarExtra, open, Icon, Color } from "@raycast/api";
import { useMemo } from "react";
import { useDeliveries } from "./hooks/useDeliveries";
import { usePackages } from "./hooks/usePackages";
import { useRefreshDeliveries } from "./hooks/useRefreshDeliveries";
import { deliveryStatus } from "./package";
import { groupDeliveriesByStatus } from "./services/sortingService";
import carriers from "./carriers";

export default function MenuBarCommand() {
  const { activeDeliveries, isLoading } = useDeliveries();
  const { packages, setPackages } = usePackages();
  const { handleRefresh, refreshTitle } = useRefreshDeliveries(activeDeliveries, packages, setPackages);

  // Memoize expensive grouping computation with limits to avoid processing all deliveries
  // Only process what we'll actually display: 10 arriving today, 5 in transit, 3 delivered
  const grouped = useMemo(
    () =>
      groupDeliveriesByStatus(activeDeliveries, packages, {
        maxArrivingToday: 10,
        maxInTransit: 5,
        maxDelivered: 3,
      }),
    [activeDeliveries, packages],
  );

  // Memoize status computation cache to avoid recalculating on every render
  const statusCache = useMemo(() => {
    const cache = new Map<string, { value: string; color?: Color }>();
    // Pre-compute status for in-transit items only (the ones that need it)
    grouped.inTransit.forEach((delivery) => {
      const status = deliveryStatus(packages[delivery.id]?.packages);
      cache.set(delivery.id, status);
    });
    return cache;
  }, [grouped.inTransit, packages]);

  const totalInTransit = grouped.arrivingToday.length + grouped.inTransit.length;

  const menuBarTitle = totalInTransit > 0 ? `${totalInTransit}` : undefined;
  const menuBarIcon = totalInTransit > 0 ? { source: "extension-icon-64x64.png" } : "extension-icon-64x64.png";

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
                if (!carrier) {
                  return (
                    <MenuBarExtra.Item
                      key={delivery.id}
                      icon={Icon.QuestionMark}
                      title={delivery.name}
                      subtitle="Unknown Carrier"
                      onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                    />
                  );
                }
                return (
                  <MenuBarExtra.Item
                    key={delivery.id}
                    icon={carrier.icon}
                    title={delivery.name}
                    subtitle={carrier.name}
                    onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                  />
                );
              })}
            </MenuBarExtra.Section>
          )}

          {grouped.inTransit.length > 0 && (
            <MenuBarExtra.Section title="In Transit">
              {grouped.inTransit.map((delivery) => {
                const status = statusCache.get(delivery.id) || { value: "En route" };
                const carrier = carriers.get(delivery.carrier);
                if (!carrier) {
                  return (
                    <MenuBarExtra.Item
                      key={delivery.id}
                      icon={Icon.QuestionMark}
                      title={delivery.name}
                      subtitle={status.value}
                      onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                    />
                  );
                }
                return (
                  <MenuBarExtra.Item
                    key={delivery.id}
                    icon={carrier.icon}
                    title={delivery.name}
                    subtitle={status.value}
                    onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                  />
                );
              })}
              {activeDeliveries.length > grouped.arrivingToday.length + grouped.inTransit.length && (
                <MenuBarExtra.Item
                  title="View all deliveries..."
                  onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {grouped.delivered.length > 0 && (
            <MenuBarExtra.Section title="Recently Delivered">
              {grouped.delivered.map((delivery) => {
                const carrier = carriers.get(delivery.carrier);
                if (!carrier) {
                  return (
                    <MenuBarExtra.Item
                      key={delivery.id}
                      icon={Icon.QuestionMark}
                      title={delivery.name}
                      onAction={() => open("raycast://extensions/halprin/delivery-tracker/track-deliveries")}
                    />
                  );
                }
                return (
                  <MenuBarExtra.Item
                    key={delivery.id}
                    icon={carrier.icon}
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
        <MenuBarExtra.Item title={refreshTitle} icon={Icon.RotateClockwise} onAction={() => handleRefresh(true)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
