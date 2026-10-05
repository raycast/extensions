import { randomBytes } from "node:crypto";

const STABLE_ID_PATTERN = /^[0-9a-f]{32}$/i;

export function isStableWorkspaceId(value: string | undefined | null): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

export function createStableId(): string {
  return randomBytes(16).toString("hex");
}

export function ensureStableId(value: string | undefined | null): string {
  return isStableWorkspaceId(value) ? value.toLowerCase() : createStableId();
}
