import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = {
  routingFormId: string;
  /** Routing form field responses as a JSON-encoded object keyed by field id. */
  responseJson: string;
  /** ISO 8601 start of window to search. */
  start: string;
  /** ISO 8601 end of window. */
  end: string;
  /** IANA timezone for the returned slots. */
  timeZone?: string;
};

/**
 * Calculate available slots for a routing form response — routes the response
 * to the right event type / host and returns matching availability.
 */
export default async function tool(input: Input): Promise<unknown> {
  const id = assertId(input.routingFormId, "routingFormId");
  let response: unknown;
  try {
    response = JSON.parse(input.responseJson);
  } catch {
    throw new Error("responseJson must be valid JSON.");
  }
  return calAPI({
    method: "POST",
    url: `/routing-forms/${id}/slots`,
    data: {
      response,
      start: input.start,
      end: input.end,
      ...(input.timeZone ? { timeZone: input.timeZone } : {}),
    },
  });
}
