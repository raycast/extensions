import { fetchDeliveries, FilterMode, getStatusDescription } from "../api";

/**
 * Get detailed information about a specific delivery.
 *
 * **Usage:**
 * Find a specific delivery by tracking number and get its detailed information.
 *
 * @param input.tracking_number The tracking number of the delivery to find.
 * @returns Detailed information about the requested delivery or null if not found.
 */
type Input = {
  /**
   * The tracking number of the delivery to find.
   * This is case-sensitive and must match exactly.
   */
  tracking_number: string;
};

export default async function getDeliveryDetails(input: Input) {
  try {
    // Try active deliveries first
    let deliveries = await fetchDeliveries(FilterMode.ACTIVE);
    let delivery = deliveries.find((d) => d.tracking_number === input.tracking_number);

    // If not found in active, try recent
    if (!delivery) {
      deliveries = await fetchDeliveries(FilterMode.RECENT);
      delivery = deliveries.find((d) => d.tracking_number === input.tracking_number);
    }

    if (!delivery) {
      return {
        found: false,
        message: `No delivery found with tracking number ${input.tracking_number}`,
      };
    }

    // Format dates for better readability
    const formatDate = (dateString: string | undefined | null): string => {
      if (!dateString) return "Not available";

      try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return "Invalid date";
      }
    };

    // Calculate days until delivery
    const calculateDaysUntil = (dateString: string | undefined | null): string => {
      if (!dateString) return "Unknown";

      try {
        const deliveryDate = new Date(dateString);
        const today = new Date();

        // Reset time for accurate day calculation
        deliveryDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = deliveryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `${Math.abs(diffDays)} day(s) ago`;
        if (diffDays === 0) return "Today";
        return `In ${diffDays} day(s)`;
      } catch {
        return "Unknown";
      }
    };

    // Format tracking events
    const formattedEvents =
      delivery.events?.map((event) => {
        return {
          ...event,
          formatted_date: formatDate(event.date),
          time: event.date
            ? new Date(event.date).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Unknown",
        };
      }) || [];

    // Return formatted delivery information
    return {
      found: true,
      delivery: {
        ...delivery,
        formatted_date_expected: formatDate(delivery.date_expected),
        delivery_timeframe: calculateDaysUntil(delivery.date_expected),
        status_description: getStatusDescription(delivery.status_code),
        formatted_events: formattedEvents,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch delivery details: ${(error as Error).message}`);
  }
}
