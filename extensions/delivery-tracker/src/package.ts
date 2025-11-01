import { Color, Icon } from "@raycast/api";
import { Delivery } from "./delivery";

interface Activity {
  time: Date;
  description: string;
  location: string;
}

export interface Package {
  deliveryDate?: Date;
  delivered: boolean;
  activity: Activity[];
}

export interface PackageMap {
  [key: string]: {
    packages: Package[];
    lastUpdated?: Date;
  };
}

export function packagesFromOfflineCarrier(delivery: Delivery): Package[] {
  return [
    {
      delivered: delivery.manualMarkedAsDelivered ?? false,
      deliveryDate: delivery.manualDeliveryDate,
      activity: [],
    },
  ];
}

export function deliveryIcon(packages?: Package[]): Icon {
  if (!packages || packages.length === 0) {
    // there are no packages for this tracking, possible before data has been gotten from API
    return Icon.QuestionMarkCircle;
  }

  const somePackagesDelivered = packages.some((aPackage) => aPackage.delivered);
  let allPackagesDelivered = false;
  if (somePackagesDelivered) {
    allPackagesDelivered = packages.every((aPackage) => aPackage.delivered);
  }

  if (allPackagesDelivered) {
    return Icon.CheckCircle;
  } else if (somePackagesDelivered) {
    return Icon.Circle;
  }

  return Icon.CircleProgress;
}

export function deliveryStatus(packages?: Package[]): { value: string; color?: Color } {
  // check whether all, some, or no packages in a track are delivered

  if (!packages || packages.length === 0) {
    return {
      value: "No packages",
      color: Color.Orange,
    };
  }

  const somePackagesDelivered = packages.some((aPackage) => aPackage.delivered);
  let allPackagesDelivered = false;
  if (somePackagesDelivered) {
    allPackagesDelivered = packages.every((aPackage) => aPackage.delivered);
  }

  if (allPackagesDelivered) {
    return {
      value: "Delivered",
      color: Color.Green,
    };
  }

  // find closest estimated delivered package
  const closestPackage = getPackageWithEarliestDeliveryDate(packages);

  let accessoryText = "En route";
  if (closestPackage?.deliveryDate) {
    const now = new Date();
    accessoryText = calculateDayDifference(closestPackage.deliveryDate, now).toString() + " days until delivery";
  }

  let accessoryColor = undefined;
  if (somePackagesDelivered && !allPackagesDelivered) {
    accessoryText = accessoryText + "; some packages delivered";
    accessoryColor = Color.Blue;
  }

  return {
    value: accessoryText,
    color: accessoryColor,
  };
}

export function getPackageWithEarliestDeliveryDate(packages: Package[]): Package | null {
  if (packages.length === 0) {
    return null;
  }

  const now = new Date();

  return packages.reduce((closest, current) => {
    const closestDeliveryDate = closest.deliveryDate;
    const currentDeliveryDate = current.deliveryDate;

    if (!currentDeliveryDate) {
      // current package has an unknown delivery date
      return closest;
    }

    if (!closestDeliveryDate) {
      // previous package has an unknown delivery date
      return current;
    }

    if (
      Math.abs(currentDeliveryDate.getTime() - now.getTime()) < Math.abs(closestDeliveryDate.getTime() - now.getTime())
    ) {
      return current;
    } else {
      return closest;
    }
  });
}

export function calculateDayDifference(deliveryDate: Date, comparisonDate: Date): number {
  const millisecondsInDay = 1000 * 60 * 60 * 24;

  const millisecondsDifference = deliveryDate.getTime() - comparisonDate.getTime();
  let dayDifference = Math.ceil(millisecondsDifference / millisecondsInDay);

  if (dayDifference < 0) {
    dayDifference = 0;
  }

  return dayDifference;
}

export function allPackagesDeliveredForDeliveryId(deliveryId: string, packages: PackageMap): boolean {
  const deliveryPackages = packages[deliveryId]?.packages;
  if (!deliveryPackages) {
    return false;
  }
  return deliveryPackages.every((aPackage) => aPackage.delivered); // all the packages of this delivery have been delivered
}
