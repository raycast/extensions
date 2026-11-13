import type { TriggerJson } from "bettertouchtool";
import type { TriggerDefinition } from "bettertouchtool/catalog";

export interface ConfiguredTrigger extends TriggerJson {
  BTTBelongsToApp?: string;
  BTTGestureNotes?: string;
  BTTGroupName?: string;
  BTTIsPureAction?: boolean;
  BTTNotes?: string;
  BTTPredefinedActionName?: string;
  BTTTriggerBelongsToPreset?: string;
  BTTTriggerClass: string;
  BTTTriggerParentUUID?: string;
  BTTUUID: string;
}

export interface TriggerListMetadata {
  category: string;
  subtitle?: string;
  title: string;
  typeName: string;
}

export function getConfiguredTriggers(triggers: readonly TriggerJson[]): ConfiguredTrigger[] {
  return triggers.filter(
    (trigger): trigger is ConfiguredTrigger =>
      trigger.BTTIsPureAction !== true &&
      typeof trigger.BTTUUID === "string" &&
      trigger.BTTUUID.length > 0 &&
      typeof trigger.BTTTriggerClass === "string" &&
      trigger.BTTTriggerClass.length > 0,
  );
}

export function getTriggerListMetadata(
  trigger: ConfiguredTrigger,
  catalog: readonly TriggerDefinition[],
): TriggerListMetadata {
  const definition = findTriggerDefinition(trigger, catalog);
  const typeName =
    readString(trigger.BTTTriggerTypeDescription) ?? definition?.name ?? humanizeTriggerClass(trigger.BTTTriggerClass);
  const title =
    readString(trigger.BTTTriggerName) ??
    readString(trigger.BTTGroupName) ??
    readString(trigger.BTTGestureNotes) ??
    readString(trigger.BTTNotes) ??
    typeName;
  const actionName = readString(trigger.BTTPredefinedActionName);
  const subtitleParts = [
    typeName !== title ? typeName : undefined,
    actionName !== title ? actionName : undefined,
  ].filter((value): value is string => Boolean(value));

  return {
    title,
    typeName,
    category: trigger.BTTGroupName ? "Groups" : (definition?.category ?? humanizeTriggerClass(trigger.BTTTriggerClass)),
    ...(subtitleParts.length > 0 ? { subtitle: subtitleParts.join(" · ") } : {}),
  };
}

export function getTriggerGroupPaths(triggers: readonly ConfiguredTrigger[]): Map<string, string> {
  const groups = new Map(
    triggers
      .filter((trigger) => typeof trigger.BTTGroupName === "string" && trigger.BTTGroupName.length > 0)
      .map((trigger) => [trigger.BTTUUID, trigger]),
  );
  const paths = new Map<string, string>();

  function resolve(uuid: string, visited = new Set<string>()): string | undefined {
    const cached = paths.get(uuid);
    if (cached) return cached;
    const group = groups.get(uuid);
    if (!group?.BTTGroupName || visited.has(uuid)) return undefined;

    visited.add(uuid);
    const parentPath = group.BTTTriggerParentUUID ? resolve(group.BTTTriggerParentUUID, visited) : undefined;
    const path = parentPath ? `${parentPath} › ${group.BTTGroupName}` : group.BTTGroupName;
    paths.set(uuid, path);
    return path;
  }

  for (const uuid of groups.keys()) resolve(uuid);
  return paths;
}

export function getTriggerParentGroupPath(
  trigger: ConfiguredTrigger,
  groupPaths: ReadonlyMap<string, string>,
): string | undefined {
  return trigger.BTTTriggerParentUUID ? groupPaths.get(trigger.BTTTriggerParentUUID) : undefined;
}

function findTriggerDefinition(
  trigger: ConfiguredTrigger,
  catalog: readonly TriggerDefinition[],
): TriggerDefinition | undefined {
  if (typeof trigger.BTTTriggerType !== "number") return undefined;
  return (
    catalog.find(
      (definition) => definition.id === trigger.BTTTriggerType && definition.triggerClass === trigger.BTTTriggerClass,
    ) ?? catalog.find((definition) => definition.id === trigger.BTTTriggerType)
  );
}

function humanizeTriggerClass(triggerClass: string): string {
  const value = triggerClass.replace(/^BTTTriggerType/, "");
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2") || "Other";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
