import { TrainingType } from "../types";

export type TemporaryDisableKind = "speaking" | "listening";
export type TemporaryDisableState = Partial<Record<TemporaryDisableKind, number>>;

export const TEMPORARY_DISABLE_DURATION_MS = 15 * 60 * 1000;

const TEMPORARY_DISABLE_TYPES: Record<TemporaryDisableKind, TrainingType[]> = {
  speaking: [TrainingType.SPEAKING],
  listening: [TrainingType.LISTENING, TrainingType.MATCHING_LEARNING_ITEM_LISTENING],
};
const TEMPORARY_DISABLE_KINDS: TemporaryDisableKind[] = ["speaking", "listening"];

export function getTemporaryDisableTypes(kind: TemporaryDisableKind): TrainingType[] {
  return TEMPORARY_DISABLE_TYPES[kind];
}

export function addTemporaryDisabledTypes(current: Set<TrainingType>, kind: TemporaryDisableKind): Set<TrainingType> {
  const next = new Set(current);

  getTemporaryDisableTypes(kind).forEach((type) => {
    next.add(type);
  });

  return next;
}

export function normalizeTemporaryDisableState(value: unknown): TemporaryDisableState {
  if (!value || typeof value !== "object") return {};

  const input = value as Record<string, unknown>;
  const normalized: TemporaryDisableState = {};

  TEMPORARY_DISABLE_KINDS.forEach((kind) => {
    const disabledUntil = input[kind];
    if (typeof disabledUntil === "number" && Number.isFinite(disabledUntil)) {
      normalized[kind] = disabledUntil;
    }
  });

  return normalized;
}

export function applyTemporaryDisableCooldown(
  current: TemporaryDisableState,
  kind: TemporaryDisableKind,
  now = Date.now(),
): TemporaryDisableState {
  return {
    ...current,
    [kind]: now + TEMPORARY_DISABLE_DURATION_MS,
  };
}

export function isTemporaryDisableActive(
  current: TemporaryDisableState,
  kind: TemporaryDisableKind,
  now = Date.now(),
): boolean {
  const disabledUntil = current[kind];
  return typeof disabledUntil === "number" && disabledUntil > now;
}

export function pruneExpiredTemporaryDisableState(
  current: TemporaryDisableState,
  now = Date.now(),
): TemporaryDisableState {
  const pruned: TemporaryDisableState = {};

  TEMPORARY_DISABLE_KINDS.forEach((kind) => {
    if (isTemporaryDisableActive(current, kind, now)) {
      pruned[kind] = current[kind];
    }
  });

  return pruned;
}

export function getActiveTemporarilyDisabledTypes(current: TemporaryDisableState, now = Date.now()): Set<TrainingType> {
  const activeTypes = new Set<TrainingType>();

  TEMPORARY_DISABLE_KINDS.forEach((kind) => {
    if (!isTemporaryDisableActive(current, kind, now)) return;
    getTemporaryDisableTypes(kind).forEach((type) => activeTypes.add(type));
  });

  return activeTypes;
}

export function filterOutTemporarilyDisabledTypes(
  types: TrainingType[],
  state: TemporaryDisableState,
  now = Date.now(),
): TrainingType[] {
  const disabled = getActiveTemporarilyDisabledTypes(state, now);
  return types.filter((type) => !disabled.has(type));
}

export function canTemporarilyDisableKind(
  availableTypes: TrainingType[],
  currentDisabled: Set<TrainingType>,
  kind: TemporaryDisableKind,
): boolean {
  const typesToDisable = getTemporaryDisableTypes(kind).filter((type) => availableTypes.includes(type));

  if (typesToDisable.length === 0) return false;

  const nextDisabled = new Set(currentDisabled);
  typesToDisable.forEach((type) => nextDisabled.add(type));

  return availableTypes.some((type) => !nextDisabled.has(type));
}

export function isTrainingTypeTemporarilyDisabled(
  type: TrainingType,
  temporarilyDisabledTypes: Set<TrainingType>,
): boolean {
  return temporarilyDisabledTypes.has(type);
}
