import { Tool } from "@raycast/api";
import { calAPI, type CalSchedule } from "@api/cal.com";
import { confirmDestructive } from "@/lib/ai-tools";

type Input = {
  name: string;
  /** IANA timezone. */
  timeZone: string;
  /** If true, set as the user's default schedule. */
  isDefault?: boolean;
  /** Weekly availability rules as a JSON-encoded array of `{ "days": ["Monday", ...], "startTime": "09:00", "endTime": "17:00" }`. */
  availabilityJson?: string;
  /** Date-specific overrides as a JSON-encoded array of `{ "date": "YYYY-MM-DD", "startTime": "09:00", "endTime": "17:00" }`. */
  overridesJson?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Create schedule "${input.name}" (${input.timeZone})${input.isDefault ? " as default" : ""}?`,
    image: "🗓️",
  });

export default async function tool(input: Input): Promise<CalSchedule> {
  const data: Record<string, unknown> = {
    name: input.name,
    timeZone: input.timeZone,
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
  };
  if (input.availabilityJson) {
    try {
      data.availability = JSON.parse(input.availabilityJson);
    } catch {
      throw new Error("availabilityJson must be valid JSON.");
    }
  }
  if (input.overridesJson) {
    try {
      data.overrides = JSON.parse(input.overridesJson);
    } catch {
      throw new Error("overridesJson must be valid JSON.");
    }
  }
  return calAPI<CalSchedule>({
    method: "POST",
    url: "/schedules",
    headers: { "cal-api-version": "2024-06-11" },
    data,
  });
}
