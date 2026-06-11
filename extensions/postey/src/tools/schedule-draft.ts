import { Tool } from "@raycast/api";
import { scheduleDraft } from "../lib/api";

type Input = {
  /** The ID of the draft to schedule. */
  draft_id: number;
  /** The social set ID the draft belongs to. */
  social_set_id: number;
  /** ISO 8601 date and time to schedule the draft for. */
  schedule_date: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const date = parseScheduleDate(input.schedule_date);
  return {
    message: `Schedule draft #${input.draft_id} for ${date.toLocaleString()}?`,
  };
};

function parseScheduleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid schedule_date. Use ISO 8601 date-time with timezone.");
  }
  if (date.getTime() <= Date.now()) {
    throw new Error("schedule_date must be in the future.");
  }
  return date;
}

export default async function tool(input: Input) {
  const publishAt = parseScheduleDate(input.schedule_date).toISOString();
  const result = await scheduleDraft(input.draft_id, input.social_set_id, publishAt);

  return {
    id: result.id ?? input.draft_id,
    social_set_id: result.social_set_id ?? input.social_set_id,
    status: result.status ?? "scheduled",
    scheduled_date: result.scheduled_date ?? publishAt,
    url: result.private_url ?? null,
  };
}
