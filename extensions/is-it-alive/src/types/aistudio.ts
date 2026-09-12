/**
 * The AI Studio status page has no REST API; it calls a protobuf-JSON RPC
 * (MakerSuiteService/ListIncidentsHistory) that returns positional arrays.
 *
 * Incident tuple: [id, title, severity, updates, ?, productIds]
 * Update tuple: [state, "YYYY-MM-DD HH:MM" (US/Pacific), [epochSeconds], text]
 */
export type AiStudioUpdateTuple = [
  state: number,
  localTime: string,
  epoch: [string],
  text: string,
];

export type AiStudioIncidentTuple = [
  id: string,
  title: string,
  severity: number,
  updates: AiStudioUpdateTuple[],
  unknown?: number,
  productIds?: number[],
];

export type AiStudioIncidentsResponse = [[AiStudioIncidentTuple[]]];

/** Update states observed in the wild. */
export const AI_STUDIO_STATE_RESOLVED = 4;

export const AI_STUDIO_STATE_NAMES: Record<number, string> = {
  1: "investigating",
  2: "identified",
  3: "monitoring",
  4: "resolved",
  5: "mitigated",
};
