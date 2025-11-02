import { Delivery } from "../types/delivery";
import { PackageMap, Package } from "../types/package";
import { getPackageWithEarliestDeliveryDate, calculateDayDifference } from "../package";

function hasPackages(packages: Package[]): boolean {
  return packages.length > 0;
}

function allPackagesDelivered(packages: Package[]): boolean {
  return packages.every((pkg) => pkg.delivered);
}

function somePackagesDelivered(packages: Package[]): boolean {
  return packages.some((pkg) => pkg.delivered);
}

function compareByPackageAvailability(aPackages: Package[], bPackages: Package[]): number {
  if (hasPackages(aPackages) && !hasPackages(bPackages)) return -1;
  if (!hasPackages(aPackages) && hasPackages(bPackages)) return 1;
  return 0;
}

function compareByDeliveryStatus(aPackages: Package[], bPackages: Package[]): number {
  const aAllDelivered = allPackagesDelivered(aPackages);
  const bAllDelivered = allPackagesDelivered(bPackages);

  if (aAllDelivered && !bAllDelivered) return 1; // delivered items go to bottom
  if (!aAllDelivered && bAllDelivered) return -1;
  return 0;
}

function compareByDeliveryDate(
  aPackages: Package[],
  bPackages: Package[],
  now: Date,
): { comparison: number; aDate?: Date; bDate?: Date } {
  const aEarliestDeliveryDate = getPackageWithEarliestDeliveryDate(aPackages)?.deliveryDate;
  const bEarliestDeliveryDate = getPackageWithEarliestDeliveryDate(bPackages)?.deliveryDate;

  if (aEarliestDeliveryDate && !bEarliestDeliveryDate) return { comparison: -1 };
  if (!aEarliestDeliveryDate && bEarliestDeliveryDate) return { comparison: 1 };
  if (!aEarliestDeliveryDate && !bEarliestDeliveryDate) return { comparison: 0 };

  const dayDifferenceDifference =
    calculateDayDifference(aEarliestDeliveryDate!, now) - calculateDayDifference(bEarliestDeliveryDate!, now);

  return {
    comparison: dayDifferenceDifference,
    aDate: aEarliestDeliveryDate,
    bDate: bEarliestDeliveryDate,
  };
}

function compareByPartialDelivery(aPackages: Package[], bPackages: Package[]): number {
  const aSomeDelivered = somePackagesDelivered(aPackages);
  const bSomeDelivered = somePackagesDelivered(bPackages);

  if (aSomeDelivered && !bSomeDelivered) return -1;
  if (!aSomeDelivered && bSomeDelivered) return 1;
  return 0;
}

export function sortTracking(tracks: Delivery[], packages: PackageMap): Delivery[] {
  return tracks.toSorted((aTrack, bTrack) => {
    const aPackages = packages[aTrack.id]?.packages ?? [];
    const bPackages = packages[bTrack.id]?.packages ?? [];

    // 1. Sort by package availability
    const packageAvailabilityComparison = compareByPackageAvailability(aPackages, bPackages);
    if (packageAvailabilityComparison !== 0) return packageAvailabilityComparison;

    if (!hasPackages(aPackages) && !hasPackages(bPackages)) return 0;

    // 2. Sort by delivery status (delivered items go to bottom)
    const deliveryStatusComparison = compareByDeliveryStatus(aPackages, bPackages);
    if (deliveryStatusComparison !== 0) return deliveryStatusComparison;

    // 3. Sort by delivery date
    const now = new Date();
    const { comparison: dateComparison } = compareByDeliveryDate(aPackages, bPackages, now);

    if (dateComparison !== 0) {
      // 4. If dates are the same, prioritize partial deliveries
      if (dateComparison === 0) {
        return compareByPartialDelivery(aPackages, bPackages);
      }
      return dateComparison;
    }

    // 5. If no delivery dates, sort by partial delivery status
    return compareByPartialDelivery(aPackages, bPackages);
  });
}

export function groupDeliveriesByStatus(
  deliveries: Delivery[],
  packages: PackageMap,
  options?: {
    maxArrivingToday?: number;
    maxInTransit?: number;
    maxDelivered?: number;
  },
): {
  arrivingToday: Delivery[];
  inTransit: Delivery[];
  delivered: Delivery[];
  unknown: Delivery[];
} {
  const now = new Date();
  const groups = {
    arrivingToday: [] as Delivery[],
    inTransit: [] as Delivery[],
    delivered: [] as Delivery[],
    unknown: [] as Delivery[],
  };

  for (const delivery of deliveries) {
    const deliveryPackages = packages[delivery.id]?.packages ?? [];

    if (!hasPackages(deliveryPackages)) {
      groups.unknown.push(delivery);
      continue;
    }

    if (allPackagesDelivered(deliveryPackages)) {
      if (!options?.maxDelivered || groups.delivered.length < options.maxDelivered) {
        groups.delivered.push(delivery);
      }
      continue;
    }

    const earliestPackage = getPackageWithEarliestDeliveryDate(deliveryPackages);
    if (earliestPackage?.deliveryDate) {
      const dayDifference = calculateDayDifference(earliestPackage.deliveryDate, now);
      if (dayDifference === 0) {
        if (!options?.maxArrivingToday || groups.arrivingToday.length < options.maxArrivingToday) {
          groups.arrivingToday.push(delivery);
        }
      } else {
        if (!options?.maxInTransit || groups.inTransit.length < options.maxInTransit) {
          groups.inTransit.push(delivery);
        }
      }
    } else {
      if (!options?.maxInTransit || groups.inTransit.length < options.maxInTransit) {
        groups.inTransit.push(delivery);
      }
    }
  }

  return groups;
}
