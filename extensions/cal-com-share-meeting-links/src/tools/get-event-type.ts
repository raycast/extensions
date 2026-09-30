import { calAPI, type CalEventType } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = {
  /** Numeric event type id. */
  eventTypeId: number;
};

export default async function tool(input: Input): Promise<CalEventType> {
  const id = assertId(input.eventTypeId, "eventTypeId");
  return calAPI<CalEventType>({
    url: `/event-types/${id}`,
    headers: { "cal-api-version": "2024-06-14" },
  });
}
