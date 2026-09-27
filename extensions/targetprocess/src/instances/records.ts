import { Instance, TargetprocessError } from "../api/types";
import { normaliseBaseUrl } from "../api/url";

export interface InstanceDraft {
  label: string;
  url: string;
  token: string;
}

export function parseInstances(raw: string | undefined | null): Instance[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isUsableInstance);
}

function isUsableInstance(value: unknown): value is Instance {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Instance>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.baseUrl === "string" &&
    candidate.baseUrl.length > 0 &&
    typeof candidate.token === "string" &&
    candidate.token.length > 0 &&
    typeof candidate.label === "string"
  );
}

export function upsertInstance(instances: Instance[], instance: Instance): Instance[] {
  const index = instances.findIndex((existing) => existing.id === instance.id);
  if (index === -1) return [...instances, instance];
  return instances.map((existing, position) => (position === index ? instance : existing));
}

export function removeInstance(instances: Instance[], id: string): Instance[] {
  return instances.filter((instance) => instance.id !== id);
}

/** A selection pointing at a deleted instance falls back silently to the first remaining one. */
export function resolveSelected(instances: Instance[], selectedId: string | null | undefined): Instance | undefined {
  return instances.find((instance) => instance.id === selectedId) ?? instances[0];
}

export function defaultLabel(baseUrl: string): string {
  const { hostname } = new URL(normaliseBaseUrl(baseUrl));
  const [first] = hostname.split(".");
  if (!first) return hostname;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Shape only; the connection is checked separately. */
export function validateDraft(draft: InstanceDraft): Pick<Instance, "label" | "baseUrl" | "token"> {
  const token = draft.token.trim();
  if (token.length === 0) {
    throw new TargetprocessError("unauthorised", "Enter a personal access token.");
  }

  const baseUrl = normaliseBaseUrl(draft.url);

  const label = draft.label.trim() || defaultLabel(baseUrl);

  return { label, baseUrl, token };
}
