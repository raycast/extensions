import { fetchDeliveries } from "../api";

/**
 * Get a list of deliveries from Parcel.
 *
 * **Usage:**
 * Get active or recent deliveries with optional filtering.
 *
 * @param input.filter Which deliveries to show - "active" (default) or "recent"
 * @returns A list of deliveries with their tracking information.
 */
type Input = {
  /**
   * Which deliveries to show - "active" or "recent"
   * Default is "active" if not specified.
   */
  filter?: "active" | "recent";
};

export default async function getDeliveries(input?: Input) {
  try {
    // Use active by default if not specified
    const filter = input?.filter || "active";
    const deliveries = await fetchDeliveries(filter);

    // Format the delivery dates and add readable status descriptions
    return deliveries.map((delivery) => {
      const formattedDelivery = {
        ...delivery,
        formatted_date_expected: delivery.date_expected
          ? new Date(delivery.date_expected).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Not available",
        status_description: getStatusDescription(delivery.status_code),
      };

      return formattedDelivery;
    });
  } catch (error) {
    throw new Error(`Failed to fetch deliveries: ${(error as Error).message}`);
  }
}

// Helper function to get status descriptions
function getStatusDescription(statusCode: string | number): string {
  const STATUS_DESCRIPTIONS: Record<string, string> = {
    delivered: "Delivered",
    out_for_delivery: "Out for Delivery",
    in_transit: "In Transit",
    exception: "Exception",
    pending: "Pending",
    expired: "Expired",
    returning: "Returning to Sender",
  };

  return STATUS_DESCRIPTIONS[statusCode.toString()] || "Unknown Status";
}
