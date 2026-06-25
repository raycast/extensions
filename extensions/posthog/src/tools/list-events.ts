import { clampLimit, pickProperties, posthogRequest } from "../posthog-client";
import { requireAccountId, requireProjectId } from "../tool-auth";

type Input = {
  accountId?: string;
  projectId?: number;
  event?: string;
  after?: string;
  before?: string;
  limit?: number;
  /** Comma-separated property keys to include. */
  propertyKeys?: string;
  maxPropertyValueLength?: number;
};

type Event = {
  id?: string;
  uuid?: string;
  event?: string;
  timestamp?: string;
  distinct_id?: string;
  properties?: Record<string, unknown>;
  person?: { id?: number; name?: string; distinct_ids?: string[] };
};

type EventsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Event[];
};

export default async function tool({
  accountId,
  projectId,
  event,
  after,
  before,
  limit,
  propertyKeys,
  maxPropertyValueLength,
}: Input = {}) {
  const resolvedAccountId = requireAccountId(accountId);
  const resolvedProjectId = requireProjectId(projectId);
  const response = await posthogRequest<EventsResponse>(resolvedAccountId, `projects/${resolvedProjectId}/events/`, {
    query: {
      event,
      after,
      before,
      limit: clampLimit(limit, 25, 100),
    },
  });

  return {
    accountId: resolvedAccountId,
    projectId: resolvedProjectId,
    count: response.count,
    next: response.next,
    events: (response.results ?? []).map((item) => ({
      id: item.uuid ?? item.id,
      event: item.event,
      timestamp: item.timestamp,
      distinctId: item.distinct_id,
      person: item.person
        ? { id: item.person.id, name: item.person.name, distinctIds: item.person.distinct_ids?.slice(0, 5) }
        : undefined,
      properties: pickProperties(
        item.properties,
        propertyKeys
          ?.split(",")
          .map((key) => key.trim())
          .filter(Boolean),
        maxPropertyValueLength,
      ),
    })),
  };
}
