import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useDeliveries } from "./hooks/useDeliveries";
import { usePackages } from "./hooks/usePackages";
import { deliveryIcon, deliveryStatus } from "./package";
import { formatDate } from "./utils/dateUtils";
import carriers from "./carriers";
import ShowDetailsView from "./views/ShowDetailsView";
import { unarchiveDelivery } from "./services/deliveryService";

export default function ViewArchivedCommand() {
  const { archivedDeliveries, activeDeliveries, setDeliveries, isLoading } = useDeliveries();
  const { packages } = usePackages();

  const allDeliveries = [...activeDeliveries, ...archivedDeliveries];

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
              delivery.archivedAt ? { text: `Archived ${formatDate(delivery.archivedAt)}`, icon: Icon.Clock } : {},
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
                  onAction={() => unarchiveDelivery(delivery.id, allDeliveries, setDeliveries)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
                <Action.OpenInBrowser
                  url={carriers.get(delivery.carrier)?.urlToTrackingWebpage(delivery) ?? ""}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
