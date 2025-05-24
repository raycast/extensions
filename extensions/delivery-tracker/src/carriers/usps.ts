import { Package, packagesFromOfflineCarrier } from "../package";
import { Delivery } from "../delivery";

export function ableToTrackUspsRemotely(): boolean {
  // doesn't support remote tracking yet.
  return false;
}

export function urlToUspsTrackingWebpage(delivery: Delivery): string {
  return `https://tools.usps.com/go/TrackConfirmAction_input?qtc_tLabels1=${delivery.trackingNumber}`;
}

export async function updateUspsTracking(delivery: Delivery): Promise<Package[]> {
  const trackingNumber = delivery.trackingNumber;

  console.log(`Updating tracking for ${trackingNumber}`);

  console.log(`Updated tracking for ${trackingNumber}`);

  return packagesFromOfflineCarrier(delivery);
}
