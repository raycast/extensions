import { open, getPreferenceValues } from "@raycast/api";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The title/name of the event.
   * Example: "Team standup"
   */
  title: string;

  /**
   * The start date and time in yyyy-MM-dd HH:mm format.
   * Example: "2026-03-20 14:00"
   */
  start: string;

  /**
   * The end date and time in yyyy-MM-dd HH:mm format.
   * Example: "2026-03-20 16:00"
   */
  end: string;

  /**
   * Optional location for the event.
   */
  location?: string;

  /**
   * Optional calendar name to add the event to (e.g. "Work", "Personal", "Family").
   * Must match an existing calendar name in Fantastical exactly.
   */
  calendarName?: string;

  /**
   * Optional array of email addresses to invite as attendees.
   */
  invitees?: string[];

  /**
   * Optional notes for the event.
   */
  notes?: string;
};

interface Preferences {
  addDirectly: boolean;
}

function formatDisplay(datetime: string): { date: string; time: string } {
  const [datePart, timePart] = datetime.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [hours, minutes] = timePart.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  const timeStr =
    minutes === 0
      ? `${h12} ${ampm}`
      : `${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;

  return { date: dateStr, time: timeStr };
}

function e(value: string): string {
  return encodeURIComponent(value);
}

export default async function (input: Input) {
  try {
    const { addDirectly } = getPreferenceValues<Preferences>();

    // Use individual parameters for precise control.
    // The trick: use sentence=/CalendarName ONLY for calendar selection,
    // while title, start, end, attendees are separate params.
    const parts: string[] = [
      `title=${e(input.title)}`,
      `start=${e(input.start)}`,
      `end=${e(input.end)}`,
      `add=${addDirectly ? "1" : "0"}`,
    ];

    // calendarName as URL param — may not work on Mac Fantastical
    // but won't break anything either
    if (input.calendarName) {
      parts.push(`calendarName=${e(input.calendarName)}`);
    }

    // Invitees: use the attendees parameter (comma-separated emails)
    if (input.invitees && input.invitees.length > 0) {
      parts.push(`attendees=${e(input.invitees.join(","))}`);
    }

    if (input.location) {
      parts.push(`location=${e(input.location)}`);
    }

    if (input.notes) {
      parts.push(`notes=${e(input.notes)}`);
    }

    const url = `x-fantastical3://parse?${parts.join("&")}`;
    console.log("Fantastical URL:", url);

    await open(url);

    let summary = `Successfully ${addDirectly ? "added" : "opened"} event in Fantastical: "${input.title}"`;
    if (input.calendarName) {
      summary += ` on calendar "${input.calendarName}"`;
    }
    if (input.invitees && input.invitees.length > 0) {
      summary += ` with invitees: ${input.invitees.join(", ")}`;
    }

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Failed to create event: ${message}. Make sure Fantastical is installed.`;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { addDirectly } = getPreferenceValues<Preferences>();
  const startDisplay = formatDisplay(input.start);
  const endDisplay = formatDisplay(input.end);

  const info: { name: string; value: string }[] = [
    { name: "Title", value: input.title },
    { name: "Date", value: startDisplay.date },
    { name: "Time", value: `${startDisplay.time} → ${endDisplay.time}` },
  ];

  if (input.location) {
    info.push({ name: "Location", value: input.location });
  }

  if (input.calendarName) {
    info.push({ name: "Calendar", value: input.calendarName });
  }

  if (input.invitees && input.invitees.length > 0) {
    info.push({ name: "Invitees", value: input.invitees.join(", ") });
  }

  info.push({
    name: "Action",
    value: addDirectly ? "Add directly" : "Open in Fantastical for review",
  });

  return {
    info,
    message:
      "Create this event? If something looks wrong, decline and tell me what to change.",
  };
};
