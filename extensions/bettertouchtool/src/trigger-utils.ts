export interface NamedTriggerState {
  BTTEnabled?: 0 | 1;
  BTTEnabled2?: 0 | 1;
  BTTTriggerName?: string;
}

export interface NamedTriggerReference {
  name: string;
  uuid: string;
}

export type TriggerFilter = "all" | "disabled" | "enabled";

export function parseNamedTriggerReferences(value: unknown): NamedTriggerReference[] {
  if (typeof value !== "string") return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is NamedTriggerReference =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        typeof entry.name === "string" &&
        "uuid" in entry &&
        typeof entry.uuid === "string",
    );
  } catch {
    return [];
  }
}

export function isTriggerEnabled(trigger: NamedTriggerState): boolean {
  return trigger.BTTEnabled !== 0 && trigger.BTTEnabled2 !== 0;
}

export function filterNamedTriggers<T extends NamedTriggerState>(triggers: readonly T[], filter: TriggerFilter): T[] {
  return triggers.filter((trigger) => {
    if (!trigger.BTTTriggerName) return false;
    if (filter === "all") return true;
    return isTriggerEnabled(trigger) === (filter === "enabled");
  });
}
