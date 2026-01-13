import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  launchCommand,
  LaunchType,
  showToast,
  open,
} from "@raycast/api";
import { isValid, parse } from "date-fns";
import { useEffect, useState } from "react";
import { Delivery, FilterMode, STATUS_DESCRIPTIONS, getStatusIcon } from "./api";
import { useDeliveries } from "./hooks/useDeliveries";
import { useCarriers } from "./hooks/useCarriers";

/**
 * Placeholder value returned by some carriers when the date is unknown.
 * This is based on observed API responses and may not be exhaustive.
 */
const UNKNOWN_DATE_PLACEHOLDER = "--//--";

/**
 * Supported date formats for parsing delivery dates.
 * American formats (MM.dd.yyyy) are tried before European (dd.MM.yyyy) to handle ambiguous dates correctly.
 */
const DATE_FORMATS = [
  "MM.dd.yyyy HH:mm:ss", // American with seconds
  "MM.dd.yyyy HH:mm", // American without seconds
  "dd.MM.yyyy HH:mm:ss", // European with seconds
  "dd.MM.yyyy HH:mm", // European without seconds
  "MMMM dd, yyyy HH:mm", // American written format
  "yyyy-MM-dd HH:mm:ss", // ISO 8601
  "EEEE, d MMMM h:mm a", // Day name, date, 12-hour time (e.g. "Saturday, 31 May 5:26 am")
  "EEEE, d MMMM", // Day name and date (e.g. "Saturday, 31 May")
  "EEEE d MMMM h:mm a", // Portuguese format (e.g. "domingo 24 agosto 11:23 PM")
  "EEEE d MMMM", // Portuguese format without time (e.g. "domingo 24 agosto")
] as const;

export default function Command() {
  const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.ACTIVE);
  const { deliveries, isLoading, error } = useDeliveries(filterMode);
  const { carriers } = useCarriers();

  /**
   * Get the carrier name from the carrier code.
   *
   * @param carrierCode The carrier code to look up
   * @returns The carrier name, or the uppercase carrier code if not found
   */
  const getCarrierName = (carrierCode: string): string => {
    const carrier = carriers.find((c) => c.code === carrierCode);
    return carrier?.name || carrierCode.toUpperCase();
  };

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
   * For ambiguous dot-separated dates (MM.dd.yyyy vs dd.MM.yyyy), tries American format first,
   * then European format, and picks the one that makes chronological sense.
   *
   * @param dateString The date string to parse
   * @returns Date object if valid, otherwise null
   */
  const parseDate = (dateString: string): Date | null => {
    // Handle ambiguous dot-separated dates (MM.dd.yyyy vs dd.MM.yyyy)
    const dotSeparatedMatch = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (dotSeparatedMatch) {
      const [, first, second, , , , sec] = dotSeparatedMatch;
      const firstNum = parseInt(first, 10);
      const secondNum = parseInt(second, 10);
      const hasSeconds = sec !== undefined;

      // If first number > 12, it must be European format (dd.MM)
      if (firstNum > 12) {
        const fmt = hasSeconds ? `dd.MM.yyyy HH:mm:ss` : `dd.MM.yyyy HH:mm`;
        const date = parse(dateString, fmt, new Date());
        if (isValid(date)) return date;
      }
      // If second number > 12, it must be American format (MM.dd)
      else if (secondNum > 12) {
        const fmt = hasSeconds ? `MM.dd.yyyy HH:mm:ss` : `MM.dd.yyyy HH:mm`;
        const date = parse(dateString, fmt, new Date());
        if (isValid(date)) return date;
      }
      // Both <= 12, ambiguous - try American first (MM.dd), then European (dd.MM)
      else {
        // Try American format first
        const americanFmt = hasSeconds ? `MM.dd.yyyy HH:mm:ss` : `MM.dd.yyyy HH:mm`;
        const americanDate = parse(dateString, americanFmt, new Date());
        if (isValid(americanDate)) return americanDate;

        // Try European format
        const europeanFmt = hasSeconds ? `dd.MM.yyyy HH:mm:ss` : `dd.MM.yyyy HH:mm`;
        const europeanDate = parse(dateString, europeanFmt, new Date());
        if (isValid(europeanDate)) return europeanDate;
      }
    }

    // Try all other formats
    for (const fmt of DATE_FORMATS) {
      const date = parse(dateString, fmt, new Date());
      if (isValid(date)) return date;
    }
    return null;
  };

  /**
   * Format a date string as 'Wednesday 09:00' for recent dates or '30 December at 11:15' for older dates.
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

    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    // For dates within the last 14 days (2 weeks), show day name with time
    // This covers recent tracking events that are still relevant
    if (daysDiff >= 0 && daysDiff < 14) {
      const dayName = date.toLocaleDateString(undefined, { weekday: "long" });
      if (hasTimeInfo) {
        const timeFormatted = date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        return `${dayName} ${timeFormatted}`;
      }
      return dayName;
    }

    // For older dates, show "DD Month at HH:mm"
    const day = date.getDate();
    const month = date.toLocaleDateString(undefined, { month: "long" });
    if (hasTimeInfo) {
      const timeFormatted = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${day} ${month} at ${timeFormatted}`;
    }
    return `${day} ${month}`;
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
    const carrierName = getCarrierName(delivery.carrier_code);
    const packageName = delivery.description || `From ${carrierName}`;
    const formattedDate = delivery.date_expected ? formatExpectedDelivery(delivery) : null;
    let deliveryDate: string;

    if (!formattedDate) {
      deliveryDate = "Not available";
    } else if (daysUntil !== null) {
      // Avoid redundant labels: if formatted date already says "Today" or "Tomorrow", don't repeat it
      const isToday = formattedDate.startsWith("Today");
      const isTomorrow = formattedDate.startsWith("Tomorrow");

      if (isToday && daysUntil === 0) {
        // Already says "Today", no need to add "(Today)"
        deliveryDate = formattedDate;
      } else if (isTomorrow && daysUntil === 1) {
        // Already says "Tomorrow", no need to add "(in 1 day)"
        deliveryDate = formattedDate;
      } else if (daysUntil < 0) {
        deliveryDate = `${formattedDate} (${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago)`;
      } else if (daysUntil === 0) {
        deliveryDate = `${formattedDate} (Today)`;
      } else {
        deliveryDate = `${formattedDate} (in ${daysUntil} day${daysUntil !== 1 ? "s" : ""})`;
      }
    } else {
      deliveryDate = formattedDate;
    }

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Package" text={packageName} />
        <List.Item.Detail.Metadata.Label title="Expected Delivery Date" text={deliveryDate} />
        <List.Item.Detail.Metadata.Label title="Status" text={STATUS_DESCRIPTIONS[delivery.status_code]} />
        <List.Item.Detail.Metadata.Label title="Carrier" text={carrierName} />
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
              <Action
                title="Add Delivery"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => launchCommand({ name: "add-delivery", type: LaunchType.UserInitiated })}
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
                title="Add Delivery"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => launchCommand({ name: "add-delivery", type: LaunchType.UserInitiated })}
              />
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
          const carrierName = getCarrierName(delivery.carrier_code);

          return (
            <List.Item
              key={`${delivery.tracking_number}-${delivery.extra_information || ""}`}
              title={delivery.description || `Package from ${carrierName}`}
              accessories={
                [
                  {
                    icon: getStatusIcon(delivery.status_code),
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
                  <Action
                    title="Add New Delivery"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => launchCommand({ name: "add-delivery", type: LaunchType.UserInitiated })}
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
