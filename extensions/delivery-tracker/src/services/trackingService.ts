import { showToast, Toast } from "@raycast/api";
import { Delivery } from "../types/delivery";
import { PackageMap } from "../types/package";
import carriers from "../carriers";
import { categorizeError, summarizeErrors, TrackingError } from "../types/errors";

export async function refreshTracking(
  forceRefresh: boolean,
  deliveries: Delivery[] | undefined,
  packages: PackageMap,
  setPackages: (value: ((prevState: PackageMap) => PackageMap) | PackageMap) => void,
  setTrackingIsLoading: (value: ((prevState: boolean) => boolean) | boolean) => void,
  refreshIntervalMinutes: number = 30,
): Promise<void> {
  if (!deliveries || !packages) {
    return;
  }

  setTrackingIsLoading(true);

  const now = new Date();
  const errors: TrackingError[] = [];

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
      now.getTime() - currentTrackPackages.lastUpdated.getTime() <= refreshIntervalMinutes * 60 * 1000
    ) {
      // skip updating if less than the configured interval since last update
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
      const categorizedError = categorizeError(error);
      errors.push(categorizedError);
    }
  }

  setTrackingIsLoading(false);

  if (errors.length > 0) {
    const summary = summarizeErrors(errors);

    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to Update ${errors.length} Deliver${errors.length > 1 ? "ies" : "y"}`,
      message: summary.userMessage,
    });

    // Log detailed error information grouped by category
    console.error("Tracking update errors by category:");
    summary.byCategory.forEach((errorMessages, category) => {
      console.error(
        `\n[${category.toUpperCase()}] (${errorMessages.length} error${errorMessages.length > 1 ? "s" : ""}):`,
      );
      errorMessages.forEach((msg) => console.error(`  - ${msg}`));
    });
  }
}
