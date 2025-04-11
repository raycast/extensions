import { ActionPanel, Action, List, Toast, showToast, Icon, open, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchDeliveries, Delivery, STATUS_DESCRIPTIONS } from "./api";

// Map status codes to icons that represent state
const STATUS_ICONS_UI: Record<number, Icon> = {
  0: Icon.CheckCircle,
  1: Icon.Snowflake,
  2: Icon.Lorry,
  3: Icon.Box,
  4: Icon.Lorry,
  5: Icon.QuestionMark,
  6: Icon.Warning,
  7: Icon.ExclamationMark,
  8: Icon.Dot,
};

export default function Command() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filterMode, setFilterMode] = useState<"active" | "recent">("active");

  useEffect(() => {
    async function loadDeliveries() {
      try {
        setIsLoading(true);
        const fetchedDeliveries = await fetchDeliveries(filterMode);
        setDeliveries(fetchedDeliveries);
        setError(null);
      } catch (e) {
        setError(e as Error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load deliveries",
          message: (e as Error).message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDeliveries();
  }, [filterMode]);

  // Calculate days until delivery
  const getDaysUntilDelivery = (delivery: Delivery): number | null => {
    if (!delivery.date_expected) return null;

    const deliveryDate = new Date(delivery.date_expected);
    const today = new Date();

    // Reset time portion for accurate day calculation
    deliveryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Format delivery time in a readable way
  const formatDeliveryTime = (daysUntil: number | null): string => {
    if (daysUntil === null) return "";

    if (daysUntil < 0) return `(${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago)`;
    if (daysUntil === 0) return "(Today)";
    return `(in ${daysUntil} day${daysUntil !== 1 ? "s" : ""})`;
  };

  // Format date in a more readable way: "Feb 26, 2025"
  const formatFriendlyDate = (dateString: string): string => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }

      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Unknown date";
    }
  };

  // Format tracking history dates in a compact format: "Feb 26, 14:30"
  const formatCompactDate = (dateString: string): string => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }

      // Create compact date portion: "Feb 26"
      const dateFormatted = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      // Create 24-hour time format: "14:30"
      const timeFormatted = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return `${dateFormatted}, ${timeFormatted}`;
    } catch (e) {
      return "Unknown date";
    }
  };

  // Generate full detail markdown including tracking history
  const generateDetailMarkdown = (delivery: Delivery, daysUntil: number | null): string => {
    const packageName = delivery.description || `From ${delivery.carrier_code.toUpperCase()}`;
    const deliveryDate = delivery.date_expected
      ? `${formatFriendlyDate(delivery.date_expected)} ${formatDeliveryTime(daysUntil)}`
      : "Not available";

    // Generate package details section without header
    let markdown = `**Package**: ${packageName}\n\n`;
    markdown += `**Expected Delivery**: ${deliveryDate}\n\n`;
    markdown += `**Status**: ${STATUS_DESCRIPTIONS[delivery.status_code]}\n\n`;
    markdown += `**Carrier**: ${delivery.carrier_code.toUpperCase()}\n\n`;
    markdown += `**Tracking Number**: ${delivery.tracking_number}\n\n`;

    if (delivery.extra_information) {
      markdown += `**Additional Info**: ${delivery.extra_information}\n\n`;
    }

    // Generate tracking history section with simpler header
    markdown += `### History\n\n`;

    if (!delivery.events || delivery.events.length === 0) {
      markdown += "No tracking information available\n";
    } else {
      delivery.events.forEach((event, index) => {
        const dateStr = formatCompactDate(event.date);
        const eventText = event.event + (event.location ? ` (${event.location})` : "");
        const icon = index === 0 ? "🔵" : "⚪️";
        markdown += `${icon} **${dateStr}** ${eventText}\n\n`;
      });
    }

    return markdown;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search deliveries..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Deliveries"
          value={filterMode}
          onChange={(newValue) => setFilterMode(newValue as "active" | "recent")}
        >
          <List.Dropdown.Item title="Active Deliveries" value="active" />
          <List.Dropdown.Item title="Recent Deliveries" value="recent" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Something went wrong"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Parcel Web"
                icon={Icon.Globe}
                onAction={() => {
                  open("https://web.parcelapp.net/");
                }}
              />
            </ActionPanel>
          }
        />
      ) : deliveries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No deliveries found"
          description={
            filterMode === "active"
              ? "You don't have any active deliveries at the moment."
              : "You don't have any recent deliveries."
          }
          actions={
            <ActionPanel>
              <Action
                title="Switch to Recent Deliveries"
                icon={Icon.Clock}
                onAction={() => setFilterMode(filterMode === "active" ? "recent" : "active")}
              />
              <Action
                title="Open Parcel Web"
                icon={Icon.Globe}
                onAction={() => {
                  open("https://web.parcelapp.net/");
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        deliveries.map((delivery) => {
          const daysUntil = getDaysUntilDelivery(delivery);

          return (
            <List.Item
              key={delivery.tracking_number}
              title={delivery.description || `Package from ${delivery.carrier_code.toUpperCase()}`}
              accessories={
                [
                  {
                    icon: STATUS_ICONS_UI[delivery.status_code],
                    tooltip: STATUS_DESCRIPTIONS[delivery.status_code],
                  },
                  daysUntil !== null
                    ? {
                        tag: {
                          value: daysUntil.toString(),
                          color: daysUntil < 0 ? Color.Red : daysUntil === 0 ? Color.Orange : Color.Green,
                        },
                        tooltip:
                          daysUntil < 0
                            ? "Overdue"
                            : daysUntil === 0
                              ? "Today"
                              : `${daysUntil} day${daysUntil !== 1 ? "s" : ""} until delivery`,
                      }
                    : null,
                ].filter(Boolean) as List.Item.Accessory[]
              }
              detail={<List.Item.Detail markdown={generateDetailMarkdown(delivery, daysUntil)} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Tracking Number" content={delivery.tracking_number} />
                  <Action.OpenInBrowser title="Open Parcel Web" url="https://web.parcelapp.net/" />
                  <Action
                    title={filterMode === "active" ? "View Recent Deliveries" : "View Active Deliveries"}
                    icon={Icon.Switch}
                    onAction={() => setFilterMode(filterMode === "active" ? "recent" : "active")}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
