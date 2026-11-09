import { isRecord, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

// `version` is the bare CalVer (2026.10.15). mise added `latest` in 2026.10.22.
export type MiseVersion = { version: string; latest?: string };

const CALVER = /^\d+\.\d+\.\d+/;

// mise reports "2026.10.15 macos-arm64 (2026-10-19)"; only the leading CalVer is kept.
export function parseVersion(raw: unknown): MiseVersion {
  const version = isRecord(raw) && typeof raw.version === "string" ? CALVER.exec(raw.version)?.[0] : undefined;
  if (!isRecord(raw) || !version) {
    throw new MiseOutputError("mise version: expected a version string", JSON.stringify(raw));
  }
  const latest = typeof raw.latest === "string" ? CALVER.exec(raw.latest.replace(/^v/, ""))?.[0] : undefined;
  return latest ? { version, latest } : { version };
}

// Undefined means the version is unknown: releases too old for `version --json`, or any failure.
export function readVersion(location: MiseLocation): Promise<MiseVersion | undefined> {
  return miseJson(location, ["version"], parseVersion).catch(() => undefined);
}

export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

// An unknown version is never at least anything, so callers fall back to flags every release accepts.
export function atLeast(version: MiseVersion | undefined, minimum: string): boolean {
  return version !== undefined && compareVersions(version.version, minimum) >= 0;
}
