import { callMcpTool } from "../lib/mcp";

/**
 * Get free/busy availability for the user (and optionally other attendees) over a time range.
 * Times are ISO 8601.
 */
type Input = {
  /**
   * Start of the availability window (ISO 8601).
   */
  start: string;
  /**
   * End of the availability window (ISO 8601).
   */
  end: string;
  /**
   * Optional attendees to include in the availability lookup.
   */
  attendees?: string[];
  /**
   * Meeting duration in minutes (used by the server to suggest free slots).
   */
  durationMinutes?: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const args: Record<string, unknown> = { start: input.start, end: input.end };
  if (input.attendees?.length) args.attendees = input.attendees;
  if (input.durationMinutes !== undefined) args.duration_minutes = input.durationMinutes;
  return callMcpTool("get_availability", args);
}
