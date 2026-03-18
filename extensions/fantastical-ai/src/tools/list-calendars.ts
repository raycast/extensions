import { getAccessToken } from "../google-auth";

type Input = {
  /**
   * Optional placeholder, not used. Just call this tool with no meaningful input.
   */
  placeholder?: string;
};

interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
}

interface CalendarListResponse {
  items: CalendarListEntry[];
}

export default async function (_input: Input) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CalendarList API error:", response.status, errorText);
      return `Failed to fetch calendars from Google: ${response.status}. ${errorText}`;
    }

    const data = (await response.json()) as CalendarListResponse;

    if (!data.items || data.items.length === 0) {
      return "No calendars found in your Google account.";
    }

    const calendars = data.items.map((cal) => {
      // Fantastical's URL scheme breaks with @ in calendarName.
      // Strip @domain from email-format names (e.g. "user@company.com" → "user")
      const fantasticalName = cal.summary.includes("@")
        ? cal.summary.split("@")[0]
        : cal.summary;
      return {
        name: cal.summary,
        fantasticalName,
        id: cal.id,
        primary: cal.primary || false,
        role: cal.accessRole,
      };
    });

    // Separate own calendars from shared/subscribed
    const own = calendars.filter(
      (c) => c.role === "owner" || c.role === "writer",
    );
    const shared = calendars.filter(
      (c) => c.role !== "owner" && c.role !== "writer",
    );

    const lines: string[] = ["Google Calendars:"];

    if (own.length > 0) {
      lines.push("\nYour calendars:");
      for (const cal of own) {
        const primary = cal.primary ? " (primary)" : "";
        const hint =
          cal.fantasticalName !== cal.name
            ? ` [use "${cal.fantasticalName}" for Fantastical]`
            : "";
        lines.push(`  - ${cal.name}${primary}${hint}`);
      }
    }

    if (shared.length > 0) {
      lines.push("\nShared/subscribed:");
      for (const cal of shared) {
        const hint =
          cal.fantasticalName !== cal.name
            ? ` [use "${cal.fantasticalName}" for Fantastical]`
            : "";
        lines.push(`  - ${cal.name}${hint}`);
      }
    }

    lines.push(
      "\nNote: These are Google calendars. If you also use iCloud or other calendars in Fantastical, just tell me the calendar name directly.",
    );

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("list-calendars error:", message);
    return `Failed to list calendars: ${message}. Make sure Google OAuth is configured in the extension preferences.`;
  }
}
