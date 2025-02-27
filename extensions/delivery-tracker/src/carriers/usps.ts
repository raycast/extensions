import { Package } from "../package";
import { Delivery } from "../delivery";

export async function ableToTrackUspsRemotely(): Promise<boolean> {
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

  return [
    {
      delivered: delivery.manualDeliveryDate
        ? new Date().setHours(0, 0, 0, 0) > delivery.manualDeliveryDate.setHours(0, 0, 0, 0)
        : false, // truncate the time from both now and the manual delivery date
      deliveryDate: delivery.manualDeliveryDate,
      activity: [],
    },
  ];
}
