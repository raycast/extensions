import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useDeliveries } from "./hooks/useDeliveries";
import { usePackages } from "./hooks/usePackages";
import { deliveryIcon, deliveryStatus } from "./package";
import carriers from "./carriers";
import ShowDetailsView from "./views/ShowDetailsView";

export default function ViewArchivedCommand() {
  const { archivedDeliveries, activeDeliveries, setDeliveries, isLoading } = useDeliveries();
  const { packages } = usePackages();

  const unarchiveDelivery = async (id: string) => {
    const delivery = archivedDeliveries.find((d) => d.id === id);
    if (!delivery) return;

    // Combine active and archived deliveries to preserve all entries
    const allDeliveries = [...activeDeliveries, ...archivedDeliveries];
    const index = allDeliveries.findIndex((d) => d.id === id);
    if (index !== -1) {
      allDeliveries[index] = { ...allDeliveries[index], archived: false, archivedAt: undefined };
      await setDeliveries(allDeliveries);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search archived deliveries...">
      {archivedDeliveries.length === 0 ? (
        <List.EmptyView
          icon="extension-icon.png"
          title="No Archived Deliveries"
          description="Deliveries you archive will appear here."
        />
      ) : (
        archivedDeliveries.map((delivery) => (
          <List.Item
            key={delivery.id}
            icon={deliveryIcon(packages[delivery.id]?.packages)}
            title={delivery.name}
            subtitle={delivery.trackingNumber}
            accessories={[
              delivery.archivedAt
                ? { text: `Archived ${delivery.archivedAt.toLocaleDateString()}`, icon: Icon.Clock }
                : {},
              { text: deliveryStatus(packages[delivery.id]?.packages) },
              {
                icon: carriers.get(delivery.carrier)?.icon,
                text: { value: carriers.get(delivery.carrier)?.name, color: carriers.get(delivery.carrier)?.color },
              },
            ].filter((acc) => Object.keys(acc).length > 0)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.MagnifyingGlass}
                  target={<ShowDetailsView delivery={delivery} packages={packages[delivery.id]?.packages ?? []} />}
                />
                <Action
                  title="Unarchive Delivery"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => unarchiveDelivery(delivery.id)}
                />
                <Action.OpenInBrowser url={carriers.get(delivery.carrier)?.urlToTrackingWebpage(delivery) ?? ""} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
