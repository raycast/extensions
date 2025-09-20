import { fetchDeliveries, FilterMode, getStatusDescription } from "../api";

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
  filter?: FilterMode;
};

export default async function getDeliveries(input?: Input) {
  try {
    const filter = input?.filter || FilterMode.ACTIVE;
    const deliveries = await fetchDeliveries(filter);

    return deliveries.map((delivery) => {
      return {
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
    });
  } catch (error) {
    throw new Error(`Failed to fetch deliveries: ${(error as Error).message}`);
  }
}
