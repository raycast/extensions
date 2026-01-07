import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";
import { getProvider } from "./providers";
import type { ProviderType, ProviderConfig, TimeSlot, LinkInfo } from "./types";

interface Preferences {
  provider: ProviderType;
  // SavvyCal
  savvycalToken?: string;
  savvycalLink?: string;
  savvycalUsername?: string;
  // Cal.com
  calcomUsername?: string;
  calcomEventSlug?: string;
  // Common
  defaultTimezone: string;
  defaultDaysAhead: string;
  bookerUrl?: string;
}

const TIMEZONES = [
  { title: "Eastern (EST/EDT)", value: "America/New_York", abbr: "ET" },
  { title: "Central (CST/CDT)", value: "America/Chicago", abbr: "CT" },
  { title: "Mountain (MST/MDT)", value: "America/Denver", abbr: "MT" },
  { title: "Pacific (PST/PDT)", value: "America/Los_Angeles", abbr: "PT" },
  { title: "UTC", value: "UTC", abbr: "UTC" },
  { title: "London (GMT/BST)", value: "Europe/London", abbr: "GMT" },
  { title: "Paris (CET/CEST)", value: "Europe/Paris", abbr: "CET" },
  { title: "Tokyo (JST)", value: "Asia/Tokyo", abbr: "JST" },
  { title: "Sydney (AEST/AEDT)", value: "Australia/Sydney", abbr: "AEST" },
];

function getTimezoneAbbr(tzValue: string): string {
  const tz = TIMEZONES.find((t) => t.value === tzValue);
  return tz?.abbr || tzValue;
}

function getProviderConfig(preferences: Preferences): ProviderConfig {
  return {
    savvycalToken: preferences.savvycalToken,
    savvycalLink: preferences.savvycalLink,
    savvycalUsername: preferences.savvycalUsername,
    calcomUsername: preferences.calcomUsername,
    calcomEventSlug: preferences.calcomEventSlug,
  };
}

function groupSlotsByDay(
  slots: TimeSlot[],
  timezone: string,
): Map<string, TimeSlot[]> {
  const grouped = new Map<string, TimeSlot[]>();

  for (const slot of slots) {
    if (!slot.start_at) continue;
    const slotDate = new Date(slot.start_at);
    if (isNaN(slotDate.getTime())) continue;

    const zonedDate = utcToZonedTime(slotDate, timezone);
    const dayKey = format(zonedDate, "yyyy-MM-dd");

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(slot);
  }

  return grouped;
}

function formatSlotTime(slot: TimeSlot, timezone: string): string {
  return formatInTimeZone(
    new Date(slot.start_at),
    timezone,
    "h:mma",
  ).toLowerCase();
}

function generateMessage(
  slots: TimeSlot[],
  timezone: string,
  clickableSlots: boolean,
  providerType: ProviderType,
  config: ProviderConfig,
  linkInfo: LinkInfo,
  duration: number,
  bookerUrl?: string,
): string {
  const provider = getProvider(providerType);
  const tzAbbr = getTimezoneAbbr(timezone);
  const groupedSlots = groupSlotsByDay(slots, timezone);

  const lines: string[] = [
    `Would any of these times work for a ${duration} min meeting (${tzAbbr})?`,
  ];

  const sortedDays = Array.from(groupedSlots.keys()).sort();

  for (const dayKey of sortedDays) {
    const daySlots = groupedSlots.get(dayKey)!;
    const zonedDate = utcToZonedTime(new Date(daySlots[0].start_at), timezone);
    const dayLabel = format(zonedDate, "EEE, MMM d");

    // Sort slots by time and show up to 4 per day
    const sortedSlots = [...daySlots].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    const displaySlots = sortedSlots.slice(0, 4);

    const slotStrings = displaySlots.map((slot) => {
      const timeStr = formatSlotTime(slot, timezone);
      if (clickableSlots) {
        const link = provider.generateBookingUrl(
          config,
          linkInfo,
          slot,
          timezone,
          bookerUrl,
          duration,
        );
        return `<a href="${link}">${timeStr}</a>`;
      }
      return timeStr;
    });

    lines.push(`• ${dayLabel}: ${slotStrings.join(", ")}`);
  }

  lines.push("");
  lines.push(
    `Feel free to use this booking page if that's easier (also contains more availabilities):`,
  );
  lines.push(provider.getFallbackUrl(config));

  return lines.join("\n");
}

// Normalize date for comparison (strip time component)
function normalizeDate(d: Date): Date {
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultDays = parseInt(preferences.defaultDaysAhead) || 10;
  const providerType = preferences.provider || "savvycal";
  const provider = getProvider(providerType);
  const config = getProviderConfig(preferences);

  // Fresh dates on every render
  const today = normalizeDate(new Date());
  const defaultEnd = addDays(today, defaultDays);

  const [startDate, setStartDate] = useState<Date | null>(today);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
  const [timezone, setTimezone] = useState(preferences.defaultTimezone);
  const [clickableSlots, setClickableSlots] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [durations, setDurations] = useState<number[]>([25, 30, 45, 60]);
  const [selectedDuration, setSelectedDuration] = useState<string>("25");
  const [, setLinkInfo] = useState<LinkInfo | null>(null);

  // Fetch link info to get available durations
  useEffect(() => {
    const loadLinkInfo = async () => {
      try {
        // Use a small date range just to get link info
        const result = await provider.fetchSlots(
          config,
          today,
          addDays(today, 1),
        );
        setLinkInfo(result.linkInfo);
        setDurations(result.linkInfo.durations);
        // Default to 25 if available, otherwise use the link's default
        const defaultDur = result.linkInfo.durations.includes(25)
          ? 25
          : result.linkInfo.defaultDuration;
        setSelectedDuration(defaultDur.toString());
      } catch (error) {
        console.error("Failed to load link durations:", error);
      }
    };
    loadLinkInfo();
  }, [providerType]);

  // Reset to fresh dates on mount
  useEffect(() => {
    const freshToday = normalizeDate(new Date());
    setStartDate(freshToday);
    setEndDate(addDays(freshToday, defaultDays));
  }, []);

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);

    try {
      const result = await provider.fetchSlots(config, startDate, endDate);

      if (result.slots.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No available slots",
          message: "No availability found in the selected date range",
        });
        setIsLoading(false);
        return;
      }

      const duration = parseInt(selectedDuration);

      const htmlMessage = generateMessage(
        result.slots,
        timezone,
        clickableSlots,
        providerType,
        config,
        result.linkInfo,
        duration,
        preferences.bookerUrl,
      );

      // Also generate plain text version (strip HTML tags)
      const plainTextMessage = generateMessage(
        result.slots,
        timezone,
        false, // No clickable slots for plain text
        providerType,
        config,
        result.linkInfo,
        duration,
        preferences.bookerUrl,
      );

      // Copy as rich text (HTML) with plain text fallback
      await Clipboard.copy({
        text: plainTextMessage,
        html: htmlMessage.replace(/\n/g, "<br>").replace(/• /g, "• "),
      });
      await showHUD("✓ Meeting times copied to clipboard!");
    } catch (error) {
      console.error("Error fetching slots:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch availability",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dateRangeText =
    startDate && endDate
      ? `${format(startDate, "EEE, MMM d")} → ${format(endDate, "EEE, MMM d, yyyy")}`
      : "Select dates";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate & Copy Message"
            icon={Icon.Clipboard}
            onSubmit={handleSubmit}
          />
          <Action
            title="Copy Calendar Link"
            icon={Icon.Link}
            onAction={async () => {
              const link = provider.getFallbackUrl(config);
              await Clipboard.copy(link);
              await showHUD("✓ Calendar link copied!");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Propose Times"
        text={`Generate a message with your ${provider.name} availability: ${dateRangeText}`}
      />

      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={startDate}
        onChange={setStartDate}
        type={Form.DatePicker.Type.Date}
      />

      <Form.DatePicker
        id="endDate"
        title="End Date"
        value={endDate}
        onChange={setEndDate}
        type={Form.DatePicker.Type.Date}
      />

      <Form.Separator />

      <Form.Dropdown
        id="duration"
        title="Meeting Duration"
        value={selectedDuration}
        onChange={setSelectedDuration}
      >
        {durations.map((d) => (
          <Form.Dropdown.Item
            key={d}
            value={d.toString()}
            title={`${d} minutes`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="timezone"
        title="Recipient's Timezone"
        value={timezone}
        onChange={setTimezone}
      >
        {TIMEZONES.map((tz) => (
          <Form.Dropdown.Item
            key={tz.value}
            value={tz.value}
            title={tz.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="clickableSlots"
        label="Clickable time slots"
        value={clickableSlots}
        onChange={setClickableSlots}
        info="Each time slot becomes a link to book that specific time"
      />
    </Form>
  );
}
