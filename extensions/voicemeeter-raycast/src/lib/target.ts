import { TargetKind, VoicemeeterTarget } from "./types";

export const MIN_GAIN_DB = -60;
export const MAX_GAIN_DB = 12;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function makeDefaultName(kind: TargetKind, index: number): string {
  const lead = kind === "strip" ? "Strip" : "Bus";
  return `${lead} ${index + 1}`;
}

export function createTargetIdentityKeys(
  kind: TargetKind,
  index: number,
  name: string,
): string[] {
  const nameKey = normalizeName(name);
  return [`${kind}:name:${nameKey}`, `${kind}:index:${index}`];
}

export function buildTargetId(
  kind: TargetKind,
  index: number,
  name: string,
): string {
  const normalizedName = normalizeName(name);
  if (normalizedName.length > 0) {
    return `${kind}:${normalizedName}:${index}`;
  }
  return `${kind}:index:${index}`;
}

export function parseGain(raw: string): number | undefined {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  if (value < MIN_GAIN_DB || value > MAX_GAIN_DB) {
    return undefined;
  }
  return Math.round(value * 100) / 100;
}

export function mergeTargetName(
  kind: TargetKind,
  index: number,
  label?: string,
): string {
  const next = label?.trim();
  if (next && next.length > 0) {
    return next;
  }
  return makeDefaultName(kind, index);
}

export function cloneTarget(target: VoicemeeterTarget): VoicemeeterTarget {
  return {
    ...target,
    identityKeys: [...target.identityKeys],
  };
}
