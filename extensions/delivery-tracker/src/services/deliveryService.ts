import { showToast, Toast, confirmAlert, Alert, Icon } from "@raycast/api";
import { Delivery } from "../types/delivery";
import { PackageMap } from "../types/package";
import { allPackagesDeliveredForDeliveryId } from "../package";

export async function toggleDeliveryDelivered(
  id: string,
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
): Promise<void> {
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

export async function deleteDelivery(
  id: string,
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
): Promise<void> {
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

export async function deleteDeliveredDeliveries(
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
  packages: PackageMap,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
): Promise<void> {
  if (!deliveries || !packages) {
    return;
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
    message: `${deliveryIdsToDelete.length} deliver${deliveryIdsToDelete.length > 1 ? "ies" : "y"} deleted`,
  });
}

export async function archiveDelivery(
  id: string,
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
): Promise<void> {
  if (!deliveries) {
    return;
  }

  const deliveryIndex = deliveries.findIndex((delivery) => delivery.id === id);
  if (deliveryIndex === -1) {
    return;
  }

  deliveries[deliveryIndex] = {
    ...deliveries[deliveryIndex],
    archived: true,
    archivedAt: new Date(),
  };

  await setDeliveries(deliveries);

  await showToast({
    style: Toast.Style.Success,
    title: "Delivery Archived",
    message: deliveries[deliveryIndex].name,
  });
}

export async function unarchiveDelivery(
  id: string,
  deliveries: Delivery[] | undefined,
  setDeliveries: (value: Delivery[]) => Promise<void>,
): Promise<void> {
  if (!deliveries) {
    return;
  }

  const deliveryIndex = deliveries.findIndex((delivery) => delivery.id === id);
  if (deliveryIndex === -1) {
    return;
  }

  deliveries[deliveryIndex] = {
    ...deliveries[deliveryIndex],
    archived: false,
    archivedAt: undefined,
  };

  await setDeliveries(deliveries);

  await showToast({
    style: Toast.Style.Success,
    title: "Delivery Unarchived",
    message: deliveries[deliveryIndex].name,
  });
}

export function atLeastOneDeliveryIsFullyDelivered(deliveries: Delivery[] | undefined, packages: PackageMap): boolean {
  if (!deliveries || !packages) {
    return false;
  }

  return deliveries
    .map((delivery) => delivery.id)
    .some((deliveryId) => allPackagesDeliveredForDeliveryId(deliveryId, packages));
}
