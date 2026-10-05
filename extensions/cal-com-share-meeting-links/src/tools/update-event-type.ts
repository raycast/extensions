import { Tool } from "@raycast/api";
import { calAPI, type CalEventType } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  eventTypeId: number;
  title?: string;
  slug?: string;
  lengthInMinutes?: number;
  description?: string;
  hidden?: boolean;
  /** Locations as a JSON-encoded array (same shape as create-event-type's locationsJson). */
  locationsJson?: string;
  disableGuests?: boolean;
  price?: number;
  currency?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const changes = Object.entries(input)
    .filter(([k, v]) => k !== "eventTypeId" && v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");
  return confirmDestructive({
    message: `Update event type ${input.eventTypeId}?\n\n${changes || "(no changes)"}`,
    image: "📅",
  });
};

export default async function tool(input: Input): Promise<CalEventType> {
  const id = assertId(input.eventTypeId, "eventTypeId");
  const { eventTypeId: _omit, locationsJson, ...patch } = input;
  void _omit;
  const data: Record<string, unknown> = { ...patch };
  if (locationsJson) {
    try {
      data.locations = JSON.parse(locationsJson);
    } catch {
      throw new Error("locationsJson must be valid JSON.");
    }
  }
  return calAPI<CalEventType>({
    method: "PATCH",
    url: `/event-types/${id}`,
    headers: { "cal-api-version": "2024-06-14" },
    data,
  });
}
