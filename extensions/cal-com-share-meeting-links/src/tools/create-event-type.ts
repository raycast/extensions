import { Tool } from "@raycast/api";
import { calAPI, type CalEventType } from "@api/cal.com";
import { confirmDestructive } from "@/lib/ai-tools";

type Input = {
  /** Title shown on the booking page. */
  title: string;
  /** URL slug (defaults to slugified title). */
  slug?: string;
  /** Length in minutes (e.g. 15, 30, 60). */
  lengthInMinutes: number;
  /** Description shown to bookers. */
  description?: string;
  /** Hidden from your public booking page. */
  hidden?: boolean;
  /**
   * Locations as a JSON-encoded array. Each entry: `{ "type": "integration", "integration": "office365_video" }` or `{ "type": "link", "link": "https://..." }`.
   * Direct the user to the cal.com web UI for complex location setups; leave blank to use defaults.
   */
  locationsJson?: string;
  /** Disable additional guests. */
  disableGuests?: boolean;
  /** Cents per booking (paid events). */
  price?: number;
  /** Currency code, e.g. "USD". */
  currency?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Create event type "${input.title}" (${input.lengthInMinutes} min)?`,
    image: "📅",
  });

export default async function tool(input: Input): Promise<CalEventType> {
  const { locationsJson, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (locationsJson) {
    try {
      data.locations = JSON.parse(locationsJson);
    } catch {
      throw new Error("locationsJson must be valid JSON.");
    }
  }
  return calAPI<CalEventType>({
    method: "POST",
    url: "/event-types",
    headers: { "cal-api-version": "2024-06-14" },
    data,
  });
}
