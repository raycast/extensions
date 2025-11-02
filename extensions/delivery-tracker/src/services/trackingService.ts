import { showToast, Toast } from "@raycast/api";
import { Delivery } from "../types/delivery";
import { PackageMap } from "../types/package";
import carriers from "../carriers";

export async function refreshTracking(
  forceRefresh: boolean,
  deliveries: Delivery[] | undefined,
  packages: PackageMap,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
  setTrackingIsLoading: (value: ((prevState: boolean) => boolean) | boolean) => void,
): Promise<void> {
  if (!deliveries || !packages) {
    return;
  }

  setTrackingIsLoading(true);

  const now = new Date();
  const errors: string[] = [];

  for (const delivery of deliveries.filter((delivery) => !delivery.debug && !delivery.archived)) {
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
      // skip updating if less than 30 minutes since last update
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
      errors.push(`${delivery.name}: ${String(error)}`);
    }
  }

  setTrackingIsLoading(false);

  if (errors.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to Update ${errors.length} Deliver${errors.length > 1 ? "ies" : "y"}`,
      message: errors.length === 1 ? errors[0] : "Check console for details",
    });
    if (errors.length > 1) {
      console.error("Tracking update errors:", errors);
    }
  }
}
