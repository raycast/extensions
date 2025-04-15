import {
  Action,
  ActionPanel,
  Icon,
  List,
  environment,
  Keyboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { debugDeliveries, debugPackages } from "./debugData";
import carriers from "./carriers";
import {
  calculateDayDifference,
  deliveryIcon,
  deliveryStatus,
  getPackageWithEarliestDeliveryDate,
  allPackagesDeliveredForDeliveryId,
  PackageMap,
} from "./package";
import { Delivery } from "./delivery";
import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import TrackNewDeliveryAction from "./views/TrackNewDeliveryAction";
import ShowDetailsView from "./views/ShowDetailsView";
import EditDeliveryView from "./views/EditDeliveryView";

export default function TrackDeliveriesCommand() {
  const {
    value: deliveries,
    setValue: setDeliveries,
    isLoading,
  } = useLocalStorage<Delivery[]>("deliveries", environment.isDevelopment ? debugDeliveries : []);

  const [packages, setPackages] = useCachedState<PackageMap>(
    "packages",
    environment.isDevelopment ? debugPackages : {},
  );

  const [trackingIsLoading, setTrackingIsLoading] = useState(false);

  useEffect(() => {
    refreshTracking(false, deliveries, packages, setPackages, setTrackingIsLoading);
  }, [deliveries]);

  return (
    <List
      isLoading={isLoading || trackingIsLoading}
      actions={
        <ActionPanel>
          <TrackNewDeliveryAction deliveries={deliveries} setDeliveries={setDeliveries} isLoading={isLoading} />
        </ActionPanel>
      }
    >
      {(deliveries ?? []).length === 0 ? (
        <List.EmptyView
          icon="extension-icon.png"
          title="No Deliveries"
          description={
            "Track a new delivery ⏎!  Fill in the API keys for the used carriers in the extension settings, or you can start by setting manual delivery dates."
          }
        />
      ) : (
        sortTracking(deliveries ?? [], packages).map((delivery) => (
          <List.Item
            key={delivery.id}
            id={delivery.id}
            icon={deliveryIcon(packages[delivery.id]?.packages)}
            title={delivery.name}
            subtitle={delivery.trackingNumber}
            accessories={[
              { text: deliveryStatus(packages[delivery.id]?.packages) },
              { text: { value: carriers.get(delivery.carrier)?.name, color: carriers.get(delivery.carrier)?.color } },
            ]}
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
                  <Action.Push
                    title="Edit Delivery"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <EditDeliveryView
                        delivery={delivery}
                        deliveries={deliveries ?? []}
                        setDeliveries={setDeliveries}
                        setPackages={setPackages}
                        isLoading={isLoading}
                      />
                    }
                  />
                  {!carriers.get(delivery.carrier)?.ableToTrackRemotely() && (
                    <Action
                      title={
                        delivery.manualMarkedAsDelivered ? "Manually Mark as Undelivered" : "Manually Mark as Delivered"
                      }
                      icon={delivery.manualMarkedAsDelivered ? Icon.CircleProgress : Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      style={Action.Style.Regular}
                      onAction={() => toggleDeliveryDelivered(delivery.id, deliveries, setDeliveries, setPackages)}
                    />
                  )}
                  <Action
                    title="Delete Delivery"
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                    onAction={() => deleteTracking(delivery.id, deliveries, setDeliveries, setPackages)}
                  />
                </ActionPanel.Section>
                <TrackNewDeliveryAction deliveries={deliveries} setDeliveries={setDeliveries} isLoading={isLoading} />
                <Action
                  title="Refresh All"
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  style={Action.Style.Regular}
                  onAction={() => {
                    refreshTracking(true, deliveries, packages, setPackages, setTrackingIsLoading);
                  }}
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
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function atLeastOneDeliveryIsFullyDelivered(deliveries: Delivery[] | undefined, packages: PackageMap): boolean {
  if (!deliveries || !packages) {
    // don't do anything until both deliveries and packages are initialized
    return false;
  }

  return deliveries
    .map((delivery) => delivery.id)
    .some((deliveryId) => allPackagesDeliveredForDeliveryId(deliveryId, packages));
}

async function refreshTracking(
  forceRefresh: boolean,
  deliveries: Delivery[] | undefined,
  packages: PackageMap,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
  setTrackingIsLoading: (value: ((prevState: boolean) => boolean) | boolean) => void,
) {
  if (!deliveries || !packages) {
    // don't do anything until both deliveries and packages are initialized
    return;
  }

  setTrackingIsLoading(true);

  const now = new Date();

  for (const delivery of deliveries.filter((delivery) => !delivery.debug)) {
    const carrier = carriers.get(delivery.carrier);
    if (!carrier) {
      continue;
    }

    const currentTrackPackages = packages[delivery.id];

    if (
      !forceRefresh &&
      currentTrackPackages &&
      currentTrackPackages.lastUpdated &&
      now.getTime() - currentTrackPackages.lastUpdated.getTime() <= 30 * 60 * 1000
    ) {
      // we have packages for this track (else cache is gone, and we need to refresh),
      // we've recorded the last update time (else we have never refreshed),
      // and it's been less than 30 minutes,
      // then...
      // skip updating
      continue;
    }

    try {
      const refreshedPackages = await carrier.updateTracking(delivery);

      setPackages((packagesMap) => {
        return {
          ...packagesMap,
          [delivery.id]: {
            packages: refreshedPackages,
            lastUpdated: now,
          },
        };
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to Update Tracking for ${delivery.trackingNumber}`,
        message: String(error),
      });
    }
  }

  setTrackingIsLoading(false);
}

async function toggleDeliveryDelivered(
  id: string,
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
) {
  if (!deliveries) {
    return;
  }

  const deliveryIndex = deliveries.findIndex((delivery) => delivery.id === id);
  if (deliveryIndex === -1) {
    return;
  }

  const toBeDelivered = !deliveries[deliveryIndex].manualMarkedAsDelivered;

  deliveries[deliveryIndex] = {
    ...deliveries[deliveryIndex],
    manualMarkedAsDelivered: toBeDelivered,
  };

  const nameOfDeliveryToMarkAsDelivered = deliveries[deliveryIndex].name;

  await setDeliveries(deliveries);

  // clear packages for this delivery so it will refresh
  setPackages((packages) => {
    delete packages[id];
    return packages;
  });

  await showToast({
    style: Toast.Style.Success,
    title: `Manually Marked as ${toBeDelivered ? "Delivered" : "Undelivered"}`,
    message: nameOfDeliveryToMarkAsDelivered,
  });
}

async function deleteTracking(
  id: string,
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
) {
  if (!deliveries) {
    return;
  }

  const nameOfDeliveryToDelete = deliveries.find((delivery) => delivery.id === id)?.name ?? "Unknown";

  const options: Alert.Options = {
    title: "Delete Delivery",
    message: `Are you sure you want to delete ${nameOfDeliveryToDelete}?`,
    icon: Icon.Trash,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  };

  const confirmation = await confirmAlert(options);
  if (!confirmation) {
    return;
  }

  const reducedDeliveries = deliveries.filter((delivery) => delivery.id !== id);
  await setDeliveries(reducedDeliveries);
  setPackages((packages) => {
    delete packages[id];
    return packages;
  });

  await showToast({
    style: Toast.Style.Success,
    title: "Deleted Delivery",
    message: nameOfDeliveryToDelete,
  });
}

async function deleteDeliveredDeliveries(
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
  packages: PackageMap,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
) {
  if (!deliveries || !packages) {
    // don't do anything until both deliveries and packages are initialized
    return false;
  }

  const deliveryIdsToDelete = deliveries
    .map((delivery) => delivery.id)
    .filter((deliveryId) => allPackagesDeliveredForDeliveryId(deliveryId, packages));

  const options: Alert.Options = {
    title: "Delete All Delivered Deliveries",
    message: `Are you sure you want to delete ${deliveryIdsToDelete.length} deliver${deliveryIdsToDelete.length > 1 ? "ies" : "y"}?`,
    icon: Icon.Trash,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  };

  const confirmation = await confirmAlert(options);
  if (!confirmation) {
    return;
  }

  const reducedDeliveries = deliveries.filter((delivery) => !deliveryIdsToDelete.includes(delivery.id));
  await setDeliveries(reducedDeliveries);
  setPackages((packages) => {
    deliveryIdsToDelete.forEach((deliveryId) => delete packages[deliveryId]);
    return packages;
  });

  await showToast({
    style: Toast.Style.Success,
    title: "Deleted Delivered Deliveries",
  });
}

function sortTracking(tracks: Delivery[], packages: PackageMap): Delivery[] {
  return tracks.toSorted((aTrack, bTrack) => {
    const aPackages = packages[aTrack.id]?.packages ?? [];
    const bPackages = packages[bTrack.id]?.packages ?? [];

    if (aPackages.length > 0 && bPackages.length === 0) {
      // a has packages, and b doesn't
      return -1;
    } else if (aPackages.length === 0 && bPackages.length > 0) {
      // a doesn't have any packages, and b does
      return 1;
    } else if (aPackages.length === 0 && bPackages.length === 0) {
      //a doesn't have any packages, and b doesn't either
      return 0;
    }

    const aAllPackagesDelivered = aPackages.every((aPackage) => aPackage.delivered);
    const bAllPackagesDelivered = bPackages.every((bPackage) => bPackage.delivered);

    if (aAllPackagesDelivered && !bAllPackagesDelivered) {
      // a has all packages delivered, and b doesn't
      return -1;
    } else if (!aAllPackagesDelivered && bAllPackagesDelivered) {
      // a doesn't have all packages delivered, and b does
      return 1;
    }

    const aEarliestDeliveryDate = getPackageWithEarliestDeliveryDate(aPackages)?.deliveryDate;
    const bEarliestDeliveryDate = getPackageWithEarliestDeliveryDate(bPackages)?.deliveryDate;

    const aSomePackagesDelivered = aPackages.some((aPackage) => aPackage.delivered);
    const bSomePackagesDelivered = bPackages.some((bPackage) => bPackage.delivered);

    if (aEarliestDeliveryDate && !bEarliestDeliveryDate) {
      // a has a delivery date, and b doesn't
      return -1;
    } else if (!aEarliestDeliveryDate && bEarliestDeliveryDate) {
      // a doesn't have a delivery date, and b does
      return 1;
    } else if (!aEarliestDeliveryDate && !bEarliestDeliveryDate) {
      // a doesn't have a delivery date, and b doesn't either

      if (aSomePackagesDelivered && !bSomePackagesDelivered) {
        // a has some packages delivered, and b doesn't
        return -1;
      } else if (!aSomePackagesDelivered && bSomePackagesDelivered) {
        // a doesn't have any packages delivered, and b does
        return 1;
      }

      // a and b both don't have any packages delivered
      return 0;
    }

    const now = new Date();
    const dayDifferenceDifference =
      calculateDayDifference(aEarliestDeliveryDate!, now) - calculateDayDifference(bEarliestDeliveryDate!, now);
    if (dayDifferenceDifference === 0) {
      // both tracks tie for earliest delivery

      if (aSomePackagesDelivered && !bSomePackagesDelivered) {
        // a has some packages delivered, and b doesn't
        return -1;
      } else if (!aSomePackagesDelivered && bSomePackagesDelivered) {
        // a doesn't have any packages delivered, and b does
        return 1;
      }

      // a and b both don't have any packages delivered
      return 0;
    }

    return dayDifferenceDifference;
  });
}
