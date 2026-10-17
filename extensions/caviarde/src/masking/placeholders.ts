import type { EntityType } from "../detection/types";

/** Counters live for one invocation only: the same value gets the same token
 * within a paste, and nothing survives it. */
export function createPlaceholderAssigner(): (
  type: EntityType,
  value: string,
) => string {
  const assigned = new Map<string, string>();
  const counters = new Map<EntityType, number>();

  return (type, value) => {
    // JSON rather than a separator character: no delimiter can collide with a value.
    const key = JSON.stringify([type, value]);
    const existing = assigned.get(key);
    if (existing !== undefined) return existing;

    const next = (counters.get(type) ?? 0) + 1;
    counters.set(type, next);

    const placeholder = `[${type}_${next}]`;
    assigned.set(key, placeholder);
    return placeholder;
  };
}
