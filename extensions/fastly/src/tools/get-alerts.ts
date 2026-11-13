import { getAlertDefinitions, getAlertHistory } from "../api";
import { AlertDefinition, AlertHistoryEntry, AlertListResponse } from "../types";

type Input = {
  /** Filter alert history by status: "firing" for currently active alerts, "resolved" for past ones. Omit for all. */
  status?: "firing" | "resolved";
};

// Follow next_cursor so the listing is complete, with a page cap as a safety guard
const MAX_PAGES = 10;

async function fetchAllPages<T>(fetchPage: (cursor?: string) => Promise<AlertListResponse<T>>): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetchPage(cursor);
    items.push(...(response.data || []));
    cursor = response.meta?.next_cursor ?? undefined;
    if (!cursor) break;
  }
  return items;
}

/**
 * List Fastly alert definitions and recent alert firing history. Use this to
 * answer whether any alerts are currently firing and what they monitor.
 */
export default async function ({ status }: Input) {
  const [definitions, history] = await Promise.all([
    fetchAllPages<AlertDefinition>((cursor) => getAlertDefinitions(cursor)),
    fetchAllPages<AlertHistoryEntry>((cursor) => getAlertHistory({ status, cursor })),
  ]);
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));

  return {
    definitions: definitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      service_id: definition.service_id,
      metric: definition.metric,
      source: definition.source,
      threshold: definition.evaluation_strategy?.threshold,
      period: definition.evaluation_strategy?.period,
    })),
    history: history.map((entry) => {
      const definition = entry.definition || definitionsById.get(entry.definition_id || "");
      return {
        alert: definition?.name || entry.definition_id,
        metric: definition?.metric,
        service_id: definition?.service_id,
        status: entry.status,
        start: entry.start,
        end: entry.end,
      };
    }),
  };
}
