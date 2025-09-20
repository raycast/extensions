import { Action, ActionPanel, Color, Icon, List, Toast, open, showToast } from "@raycast/api";
import { isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Delivery, FilterMode, STATUS_DESCRIPTIONS } from "./api";
import { useDeliveries } from "./hooks/useDeliveries";

/**
 * Placeholder value returned by some carriers when the date is unknown.
 * This is based on observed API responses and may not be exhaustive.
 */
const UNKNOWN_DATE_PLACEHOLDER = "--//--";

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
  const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.ACTIVE);
  const { deliveries, isLoading, error } = useDeliveries(filterMode);

  const DATE_FORMATS = [
    "dd.MM.yyyy HH:mm:ss", // European with seconds
    "dd.MM.yyyy HH:mm", // European without seconds
    "MMMM dd, yyyy HH:mm", // American
    "yyyy-MM-dd HH:mm:ss", // ISO 8601
    "EEEE, d MMMM h:mm a", // Day name, date, 12-hour time (e.g. "Saturday, 31 May 5:26 am")
    "EEEE, d MMMM", // Day name and date (e.g. "Saturday, 31 May")
    "EEEE d MMMM h:mm a", // Portuguese format (e.g. "domingo 24 agosto 11:23 PM")
    "EEEE d MMMM", // Portuguese format without time (e.g. "domingo 24 agosto")
  ];

  /**
   * Calculate the number of days until the expected delivery date.
   *
   * @param delivery Delivery object
   * @returns Number of days until delivery, or null if date is missing
   */
  const getDaysUntilDelivery = (delivery: Delivery): number | null => {
    if (!delivery.date_expected) return null;
    const deliveryDate = new Date(delivery.date_expected);
    const today = new Date();
    deliveryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Try to parse a date string using a set of known formats.
   *
   * @param dateString The date string to parse
   * @returns Date object if valid, otherwise null
   */
  const parseDate = (dateString: string): Date | null => {
    for (const fmt of DATE_FORMATS) {
      const date = parse(dateString, fmt, new Date(), { locale: ptBR });
      if (isValid(date)) return date;
    }
    return null;
  };

  /**
   * Format a date string as 'Feb 26, 14:30' or 'Feb 26' if no time.
   *
   * @param dateString The date string to format
   * @returns Formatted date and time or 'Not available' if invalid
   */
  const formatCompactDate = (dateString: string | undefined | null): string => {
    if (!dateString || dateString === UNKNOWN_DATE_PLACEHOLDER || !/\d/.test(dateString)) return "Not available";

    // Check if the original string contains time information
    const hasTimeInfo = /[0-9]{1,2}:[0-9]{2}/.test(dateString) || /[0-9]{1,2}:[0-9]{2} [AP]M/i.test(dateString);

    const date = parseDate(dateString);
    if (!date) {
      console.error(`All supported date formats failed for: ${dateString}`);
      return dateString;
    }
    const dateFormatted = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    // Only show time if the original string had time information
    if (!hasTimeInfo) {
      return dateFormatted;
    }

    const timeFormatted = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dateFormatted}, ${timeFormatted}`;
  };

  /**
   * Format the expected delivery date/range for display.
   *
   * Rules:
   * - If the delivery is today, show: 'Today' (plus time if not 00:00)
   * - If the delivery is tomorrow, show: 'Tomorrow' (plus time if not 00:00)
   * - If within the next 7 days, show: 'Weekday' (plus time if not 00:00)
   * - Otherwise, show: 'DD Mon' (plus year if not current year, plus time if not 00:00)
   * - For ranges, show: 'StartLabel [StartTime] – EndLabel [EndTime]'
   * - If the time is exactly 00:00, omit it.
   *
   * @param delivery Delivery object with date_expected and optional date_expected_end
   * @returns Formatted string for expected delivery
   */
  const formatExpectedDelivery = (delivery: Delivery): string => {
    if (!delivery.date_expected) return "Not available";
    const start = parseDate(delivery.date_expected);
    const end = delivery.date_expected_end ? parseDate(delivery.date_expected_end) : null;
    if (!start) return "Not available";

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    // Helper to get label for a date
    function getLabel(date: Date): string {
      if (date.toDateString() === now.toDateString()) return "Today";
      if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

      // Next 7 days window
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 8);
      nextWeek.setHours(0, 0, 0, 0);

      if (date < nextWeek) {
        return date.toLocaleDateString(undefined, { weekday: "long" });
      }

      const showYear = date.getFullYear() !== now.getFullYear();
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(showYear ? { year: "numeric" } : {}),
      });
    }

    // Helper to get time string if not 00:00
    function getTime(date: Date): string {
      if (date.getHours() === 0 && date.getMinutes() === 0) return "";
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    }

    const startLabel = getLabel(start);
    const startTime = getTime(start);
    let result = startLabel;
    if (startTime) result += ` ${startTime}`;

    if (end) {
      const endLabel = getLabel(end);
      const endTime = getTime(end);
      if (startLabel === endLabel) {
        // Same day: '12 Jun 10:45 – 12:45'
        if (endTime) {
          result += ` – ${endTime}`;
        }
      } else {
        // Different days: '12 Jun 10:45 – 13 Jun 12:45'
        result += ` – ${endLabel}`;
        if (endTime) result += ` ${endTime}`;
      }
    }
    return result;
  };

  /**
   * Generate a markdown with the tracking history.
   *
   * @param delivery Delivery object
   * @returns Markdown string for tracking history
   */
  const generateHistoryMarkdown = (delivery: Delivery): string => {
    let markdown = "";
    if (!delivery.events || delivery.events.length === 0) {
      markdown += "No tracking information available\n";
    } else {
      delivery.events.forEach((event) => {
        const dateStr = formatCompactDate(event.date);
        const eventText = event.event + (event.location ? ` (${event.location})` : "");
        markdown += `🚚 **${dateStr}**\n\n${eventText}\n\n`;
      });
    }
    return markdown;
  };

  /**
   * Generate metadata for the delivery.
   *
   * @param delivery Delivery object
   * @param daysUntil Number of days until delivery
   * @returns JSX element for metadata panel
   */
  const generateDetailMetadata = (delivery: Delivery, daysUntil: number | null) => {
    const packageName = delivery.description || `From ${delivery.carrier_code.toUpperCase()}`;
    const deliveryDate = delivery.date_expected
      ? `${formatExpectedDelivery(delivery)} ${daysUntil !== null ? (daysUntil < 0 ? `(${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago)` : daysUntil === 0 ? "(Today)" : `(in ${daysUntil} day${daysUntil !== 1 ? "s" : ""})`) : ""}`
      : "Not available";

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Package" text={packageName} />
        <List.Item.Detail.Metadata.Label title="Expected Delivery Date" text={deliveryDate} />
        <List.Item.Detail.Metadata.Label title="Status" text={STATUS_DESCRIPTIONS[delivery.status_code]} />
        <List.Item.Detail.Metadata.Label title="Carrier" text={delivery.carrier_code} />
        <List.Item.Detail.Metadata.Label title="Tracking Number" text={delivery.tracking_number} />
        {delivery.extra_information && (
          <List.Item.Detail.Metadata.Label title="Additional Info" text={delivery.extra_information} />
        )}
      </List.Item.Detail.Metadata>
    );
  };

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load deliveries",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search deliveries..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Deliveries"
          value={filterMode}
          onChange={(newValue) => setFilterMode(newValue as FilterMode)}
        >
          <List.Dropdown.Item title="Active Deliveries" value={FilterMode.ACTIVE} />
          <List.Dropdown.Item title="Recent Deliveries" value={FilterMode.RECENT} />
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
            filterMode === FilterMode.ACTIVE
              ? "You don't have any active deliveries at the moment."
              : "You don't have any recent deliveries."
          }
          actions={
            <ActionPanel>
              <Action
                title="Switch to Recent Deliveries"
                icon={Icon.Clock}
                onAction={() => setFilterMode(filterMode === FilterMode.ACTIVE ? FilterMode.RECENT : FilterMode.ACTIVE)}
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
              key={`${delivery.tracking_number}-${delivery.extra_information || ""}`}
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
              detail={
                <List.Item.Detail
                  markdown={generateHistoryMarkdown(delivery)}
                  metadata={generateDetailMetadata(delivery, daysUntil)}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Track on Website"
                    url={`https://parcel.app/webtrack.php?platform=mac&type=${delivery.carrier_code}&code=${delivery.tracking_number}`}
                  />
                  <Action.CopyToClipboard title="Copy Tracking Number" content={delivery.tracking_number} />
                  <Action.OpenInBrowser title="Open Parcel Web" url="https://web.parcelapp.net/" />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
