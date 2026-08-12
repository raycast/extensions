import type { ComponentStatus } from "../../domain/types";
import { normalizeStatusToken } from "../../utils/status-token";
import { mapFlexibleHealth } from "../utils/status-normalization";

interface ParsedXaiStatus {
  reportedHealth: ComponentStatus["health"];
  statusText?: string;
  components: ComponentStatus[];
}

export function parseXaiStatusPage(rsc: string): ParsedXaiStatus {
  if (!rsc.includes('"children":"Live service data"')) {
    throw new Error("xAI status page payload was malformed");
  }

  const references = parseReferences(rsc);
  const components: ComponentStatus[] = [];
  const servicePattern =
    /"href":"\/([^"/?#]+)"[\s\S]*?"className":"heading-2","children":"([^"]+)"([\s\S]*?)(?=\["\$","\$L\d+","[^"\]]+",\{"href":"\/|\n[\da-f]+:|$)/g;

  for (const match of rsc.matchAll(servicePattern)) {
    const id = match[1];
    const name = match[2];
    const tail = match[3] ?? "";
    if (!id || !name) continue;

    const inlineStatus = [...tail.matchAll(/"children":"([^"]+)"/g)].at(-1)?.[1];
    const referenceId = /"\$L([\da-f]+)"/.exec(tail)?.[1];
    const referencedStatus = referenceId
      ? /"children":"([^"]+)"/.exec(references.get(referenceId) ?? "")?.[1]
      : undefined;
    const statusText = inlineStatus ?? referencedStatus;
    if (!statusText) continue;

    components.push({
      id,
      name,
      health: mapFlexibleHealth(statusText),
      statusText,
    });
  }

  if (components.length === 0) throw new Error("xAI status page contained no components");

  const noIncidents = rsc.includes('"children":"No incidents declared"');
  return {
    reportedHealth: noIncidents ? "operational" : "unknown",
    statusText: noIncidents ? "No incidents declared" : undefined,
    components,
  };
}

function parseReferences(rsc: string): ReadonlyMap<string, string> {
  const references = new Map<string, string>();

  for (const line of rsc.split("\n")) {
    const match = /^([\da-f]+):(.*)$/i.exec(line);
    if (match?.[1] && match[2]) references.set(normalizeStatusToken(match[1]), match[2]);
  }

  return references;
}
