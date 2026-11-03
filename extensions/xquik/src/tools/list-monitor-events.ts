import { eventLabel, eventPost, fetchEventPage } from "../lib/events";
import { compactPost } from "../lib/format";

type Input = {
  /**
   * An account monitor ID from list-monitors, to read only its events.
   */
  monitorId?: string;
  /**
   * A keyword monitor ID from list-monitors, to read only its events.
   */
  keywordMonitorId?: string;
  /**
   * The nextCursor value of the previous call, to read the next 20 events.
   */
  cursor?: string;
};

/**
 * List the latest events from your Xquik monitors. Returns up to 20 events and a nextCursor when more exist.
 */
export default async function tool({ monitorId, keywordMonitorId, cursor }: Input) {
  const { events, nextCursor } = await fetchEventPage({ monitorId, keywordMonitorId }, cursor);
  return {
    events: events.map((event) => {
      const post = eventPost(event);
      return {
        id: event.id,
        type: eventLabel(event.type),
        occurredAt: event.occurredAt,
        username: event.username,
        query: event.query,
        post: post && compactPost(post),
        details: post ? undefined : event.data,
      };
    }),
    nextCursor,
  };
}
