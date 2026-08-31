export interface NamedTriggerState {
  BTTEnabled?: 0 | 1;
  BTTEnabled2?: 0 | 1;
  BTTTriggerName?: string;
}

export function isTriggerEnabled(trigger: NamedTriggerState): boolean {
  return trigger.BTTEnabled !== 0 && trigger.BTTEnabled2 !== 0;
}

export function filterNamedTriggers<T extends NamedTriggerState>(
  triggers: readonly T[],
  showDisabledTriggers: boolean,
): T[] {
  return triggers.filter(
    (trigger) => Boolean(trigger.BTTTriggerName) && (showDisabledTriggers || isTriggerEnabled(trigger)),
  );
}
