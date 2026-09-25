import { getAlertDefinitions, getAlertHistory } from "../api";

type Input = {
  /** Filter alert history by status: "firing" for currently active alerts, "resolved" for past ones. Omit for all. */
  status?: "firing" | "resolved";
};

/**
 * List Fastly alert definitions and recent alert firing history. Use this to
 * answer whether any alerts are currently firing and what they monitor.
 */
export default async function ({ status }: Input) {
  const [definitions, history] = await Promise.all([getAlertDefinitions(), getAlertHistory({ status })]);
  const definitionsById = new Map((definitions.data || []).map((definition) => [definition.id, definition]));

  return {
    definitions: (definitions.data || []).map((definition) => ({
      id: definition.id,
      name: definition.name,
      description: definition.description,
      service_id: definition.service_id,
      metric: definition.metric,
      source: definition.source,
      threshold: definition.evaluation_strategy?.threshold,
      period: definition.evaluation_strategy?.period,
    })),
    history: (history.data || []).map((entry) => {
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
