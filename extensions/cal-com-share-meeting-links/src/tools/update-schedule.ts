import { Tool } from "@raycast/api";
import { updateSchedule, type CalSchedule, type CalSchedulePatch } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  scheduleId: number;
  /** New schedule name. */
  name?: string;
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timeZone?: string;
  /** Set this schedule as default. */
  isDefault?: boolean;
  /** Weekly availability rules as a JSON-encoded array of `{ "days": ["Monday", ...], "startTime": "09:00", "endTime": "17:00" }`. */
  availabilityJson?: string;
  /** Date-specific overrides as a JSON-encoded array of `{ "date": "YYYY-MM-DD", "startTime": "09:00", "endTime": "17:00" }`. */
  overridesJson?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const changes = Object.entries(input)
    .filter(([k, v]) => k !== "scheduleId" && v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");
  return confirmDestructive({
    message: `Update schedule ${input.scheduleId}?\n\n${changes || "(no changes)"}`,
    image: "🗓️",
  });
};

export default async function tool(input: Input): Promise<CalSchedule> {
  const id = Number(assertId(input.scheduleId, "scheduleId"));
  const patch: CalSchedulePatch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.timeZone !== undefined) patch.timeZone = input.timeZone;
  if (input.isDefault !== undefined) patch.isDefault = input.isDefault;
  if (input.availabilityJson) {
    try {
      patch.availability = JSON.parse(input.availabilityJson);
    } catch {
      throw new Error("availabilityJson must be valid JSON.");
    }
  }
  if (input.overridesJson) {
    try {
      patch.overrides = JSON.parse(input.overridesJson);
    } catch {
      throw new Error("overridesJson must be valid JSON.");
    }
  }
  return updateSchedule(id, patch);
}
