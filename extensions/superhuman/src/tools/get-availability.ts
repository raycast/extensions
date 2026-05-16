import { callMcpTool } from "../lib/mcp";
import { GetAvailabilityInput, validate } from "../lib/validation";

/**
 * Free/busy availability for the user and optional participants.
 *
 * `participants` accepts names or email addresses — Superhuman resolves
 * names against the user's contacts. `timezone` (IANA) is required.
 * `workingHoursOnly` defaults to `true` (restrict suggestions to the
 * user's configured working hours).
 */
type Input = {
  /** Participants to include in the lookup (names or email addresses). */
  participants?: string[];
  /** Deprecated: alias for `participants`. */
  attendees?: string[];
  /** Start of the availability window (RFC3339). */
  startDate?: string;
  /** End of the availability window (RFC3339). */
  endDate?: string;
  /** Deprecated: alias for `startDate`. */
  start?: string;
  /** Deprecated: alias for `endDate`. */
  end?: string;
  /** IANA timezone for the response. Required. */
  timezone: string;
  /** Meeting duration in minutes. Defaults to 30. */
  durationMinutes?: number;
  /** Restrict to the user's working hours. Defaults to true. */
  workingHoursOnly?: boolean;
};

export default async function tool(input: Input): Promise<unknown> {
  const parsed = validate(GetAvailabilityInput, input);
  const participants = parsed.participants ?? parsed.attendees;
  const startDate = parsed.startDate ?? parsed.start;
  const endDate = parsed.endDate ?? parsed.end;

  const args: Record<string, unknown> = {
    start_date: startDate,
    end_date: endDate,
    timezone: parsed.timezone,
    duration_minutes: parsed.durationMinutes ?? 30,
    working_hours_only: parsed.workingHoursOnly ?? true,
  };
  if (participants?.length) args.participants = participants;
  return callMcpTool("get_availability", args);
}
