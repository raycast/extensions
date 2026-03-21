import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import carriers from "./carriers";
import { deliveryIcon, deliveryStatus } from "./package";
import { Delivery } from "./types/delivery";
import { useEffect, useState, useRef } from "react";
import TrackNewDeliveryAction from "./views/TrackNewDeliveryAction";
import ShowDetailsView from "./views/ShowDetailsView";
import EditDeliveryView from "./views/EditDeliveryView";
import { useDeliveries } from "./hooks/useDeliveries";
import { useRefreshDeliveries } from "./hooks/useRefreshDeliveries";
import {
  deleteDelivery,
  deleteDeliveredDeliveries,
  toggleDeliveryDelivered,
  atLeastOneDeliveryIsFullyDelivered,
  archiveDelivery,
} from "./services/deliveryService";
import { groupDeliveriesByStatus } from "./services/sortingService";
import { usePackages } from "./hooks/usePackages";
import { PackageMap } from "./types/package";

export default function TrackDeliveriesCommand() {
  const { activeDeliveries, setDeliveries, isLoading } = useDeliveries();
  const { packages, setPackages } = usePackages();
  const { trackingIsLoading, handleRefresh, refreshTitle } = useRefreshDeliveries(
    activeDeliveries,
    packages,
    setPackages,
  );
  const [selectedCarrier, setSelectedCarrier] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const prevDeliveriesRef = useRef<Delivery[] | undefined>(undefined);

  useEffect(() => {
    // Only refresh when deliveries actually change (added/removed), not on every render
    if (prevDeliveriesRef.current !== activeDeliveries) {
      prevDeliveriesRef.current = activeDeliveries;
      handleRefresh(false);
    }
  }, [activeDeliveries, handleRefresh]);

  // Filter deliveries
  const filteredDeliveries = activeDeliveries.filter((delivery) => {
    const matchesCarrier = selectedCarrier === "all" || delivery.carrier === selectedCarrier;
    const matchesSearch =
      searchText === "" ||
      delivery.name.toLowerCase().includes(searchText.toLowerCase()) ||
      delivery.trackingNumber.toLowerCase().includes(searchText.toLowerCase());
    return matchesCarrier && matchesSearch;
  });

  // Group deliveries by status
  const grouped = groupDeliveriesByStatus(filteredDeliveries, packages);

  return (
    <List
      isLoading={isLoading || trackingIsLoading}
      searchBarPlaceholder="Search deliveries by name or tracking number..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Carrier" value={selectedCarrier} onChange={setSelectedCarrier}>
          <List.Dropdown.Item title="All Carriers" value="all" icon={Icon.List} />
          {Array.from(carriers.values()).map((carrier) => (
            <List.Dropdown.Item key={carrier.id} title={carrier.name} value={carrier.id} icon={carrier.icon} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <TrackNewDeliveryAction deliveries={activeDeliveries} setDeliveries={setDeliveries} isLoading={isLoading} />
        </ActionPanel>
      }
    >
      {filteredDeliveries.length === 0 ? (
        <List.EmptyView
          icon="extension-icon.png"
          title={activeDeliveries.length === 0 ? "No Deliveries" : "No Matching Deliveries"}
          description={
            activeDeliveries.length === 0
              ? "Track a new delivery ⏎! Fill in the API keys for the used carriers in the extension settings, or you can start by setting manual delivery dates."
              : "Try adjusting your search or filter criteria."
          }
          actions={
            <ActionPanel>
              <TrackNewDeliveryAction
                deliveries={activeDeliveries}
                setDeliveries={setDeliveries}
                isLoading={isLoading}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {grouped.arrivingToday.length > 0 && (
            <List.Section
              title="Arriving Today"
              subtitle={`${grouped.arrivingToday.length} package${grouped.arrivingToday.length > 1 ? "s" : ""}`}
            >
              {grouped.arrivingToday.map((delivery) => (
                <DeliveryListItem
                  key={delivery.id}
                  delivery={delivery}
                  packages={packages}
                  deliveries={activeDeliveries}
                  setDeliveries={setDeliveries}
                  setPackages={setPackages}
                  isLoading={isLoading}
                  refreshTitle={refreshTitle}
                  handleRefresh={handleRefresh}
                />
              ))}
            </List.Section>
          )}
          {grouped.inTransit.length > 0 && (
            <List.Section
              title="In Transit"
              subtitle={`${grouped.inTransit.length} package${grouped.inTransit.length > 1 ? "s" : ""}`}
            >
              {grouped.inTransit.map((delivery) => (
                <DeliveryListItem
                  key={delivery.id}
                  delivery={delivery}
                  packages={packages}
                  deliveries={activeDeliveries}
                  setDeliveries={setDeliveries}
                  setPackages={setPackages}
                  isLoading={isLoading}
                  refreshTitle={refreshTitle}
                  handleRefresh={handleRefresh}
                />
              ))}
            </List.Section>
          )}
          {grouped.delivered.length > 0 && (
            <List.Section
              title="Delivered"
              subtitle={`${grouped.delivered.length} package${grouped.delivered.length > 1 ? "s" : ""}`}
            >
              {grouped.delivered.map((delivery) => (
                <DeliveryListItem
                  key={delivery.id}
                  delivery={delivery}
                  packages={packages}
                  deliveries={activeDeliveries}
                  setDeliveries={setDeliveries}
                  setPackages={setPackages}
                  isLoading={isLoading}
                  refreshTitle={refreshTitle}
                  handleRefresh={handleRefresh}
                />
              ))}
            </List.Section>
          )}
          {grouped.unknown.length > 0 && (
            <List.Section
              title="Unknown Status"
              subtitle={`${grouped.unknown.length} package${grouped.unknown.length > 1 ? "s" : ""}`}
            >
              {grouped.unknown.map((delivery) => (
                <DeliveryListItem
                  key={delivery.id}
                  delivery={delivery}
                  packages={packages}
                  deliveries={activeDeliveries}
                  setDeliveries={setDeliveries}
                  setPackages={setPackages}
                  isLoading={isLoading}
                  refreshTitle={refreshTitle}
                  handleRefresh={handleRefresh}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function DeliveryListItem({
  delivery,
  packages,
  deliveries,
  setDeliveries,
  setPackages,
  isLoading,
  refreshTitle,
  handleRefresh,
}: {
  delivery: Delivery;
  packages: PackageMap;
  deliveries: Delivery[];
  setDeliveries: (value: Delivery[]) => Promise<void>;
  setPackages: React.Dispatch<React.SetStateAction<PackageMap>>;
  isLoading: boolean;
  refreshTitle: string;
  handleRefresh: (forceRefresh: boolean) => Promise<void>;
}) {
  return (
    <List.Item
      key={delivery.id}
      id={delivery.id}
      icon={deliveryIcon(packages[delivery.id]?.packages)}
      title={delivery.name}
      subtitle={delivery.trackingNumber}
      accessories={[
        delivery.notes ? { icon: Icon.Document, tooltip: delivery.notes } : {},
        { text: deliveryStatus(packages[delivery.id]?.packages) },
        {
          icon: carriers.get(delivery.carrier)?.icon,
          text: { value: carriers.get(delivery.carrier)?.name, color: carriers.get(delivery.carrier)?.color },
        },
      ].filter((acc) => Object.keys(acc).length > 0)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              icon={Icon.MagnifyingGlass}
              target={<ShowDetailsView delivery={delivery} packages={packages[delivery.id]?.packages ?? []} />}
            />
            <Action.OpenInBrowser
              url={carriers.get(delivery.carrier)?.urlToTrackingWebpage(delivery) ?? ""}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CopyToClipboard
              title="Copy Tracking Number"
              shortcut={Keyboard.Shortcut.Common.Copy}
              content={delivery.trackingNumber}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Delivery"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <EditDeliveryView
                  delivery={delivery}
                  deliveries={deliveries}
                  setDeliveries={setDeliveries}
                  setPackages={setPackages}
                  isLoading={isLoading}
                />
              }
            />
            {!carriers.get(delivery.carrier)?.ableToTrackRemotely() && (
              <Action
                title={delivery.manualMarkedAsDelivered ? "Manually Mark as Undelivered" : "Manually Mark as Delivered"}
                icon={delivery.manualMarkedAsDelivered ? Icon.CircleProgress : Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                style={Action.Style.Regular}
                onAction={() => toggleDeliveryDelivered(delivery.id, deliveries, setDeliveries, setPackages)}
              />
            )}
            <Action
              title="Archive Delivery"
              icon={Icon.Box}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              style={Action.Style.Regular}
              onAction={() => archiveDelivery(delivery.id, deliveries, setDeliveries)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Delivery"
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
              onAction={() => deleteDelivery(delivery.id, deliveries, setDeliveries, setPackages)}
            />
            {atLeastOneDeliveryIsFullyDelivered(deliveries, packages) && (
              <Action
                title="Delete All Delivered Deliveries"
                icon={Icon.Trash}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                style={Action.Style.Destructive}
                onAction={() => deleteDeliveredDeliveries(deliveries, setDeliveries, packages, setPackages)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <TrackNewDeliveryAction deliveries={deliveries} setDeliveries={setDeliveries} isLoading={isLoading} />
            <Action
              title={refreshTitle}
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              style={Action.Style.Regular}
              onAction={() => handleRefresh(true)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
