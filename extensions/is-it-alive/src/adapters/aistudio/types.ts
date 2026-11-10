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
