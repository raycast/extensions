import { readServiceLogs } from "../api/dokploy-api";
import { requireClient, resolveService } from "../lib/ai";
import { ServiceKind } from "../types/dokploy";

/** Logs can be long; keep what goes to the model bounded. */
const MAX_LINES = 500;
const DEFAULT_LINES = 100;

type Input = {
  /** Name or id of the service. */
  service: string;
  /** How many lines from the end of the log to read. Defaults to 100, capped at 500. */
  lines?: number;
  /** Only return lines containing this text. */
  search?: string;
  /** Narrows the lookup when several projects have a service with the same name. */
  project?: string;
  /** Narrows the lookup to one type of service. */
  kind?: ServiceKind;
  /** Name of the Dokploy account. Defaults to the active one. */
  account?: string;
};

/**
 * The runtime log of a service - what the container is printing right now.
 * For why a *build* failed, use the deployment build log instead.
 */
export default async function tool(input: Input) {
  const client = await requireClient(input.account);
  const service = await resolveService(client, input.service, { kind: input.kind, project: input.project });

  const tail = Math.min(input.lines ?? DEFAULT_LINES, MAX_LINES);
  const logs = await readServiceLogs(client, service, { tail, search: input.search });

  return {
    service: service.name,
    project: service.projectName,
    status: service.status ?? "unknown",
    lines: tail,
    logs: logs.trim() || "(no log output)",
  };
}
