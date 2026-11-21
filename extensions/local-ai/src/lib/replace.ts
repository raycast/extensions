import { fileURLToPath } from "node:url";
import type { FinalizeResult } from "./output";

export interface ClipboardSnapshot {
  text: string;
  file?: string;
  html?: string;
}

export interface AppIdentity {
  bundleId?: string;
  path: string;
}

export type ClipboardRestoreContent = { file: string } | { html: string; text: string } | { text: string };

export type RestoreAction = "restore" | "clear" | "keep";

const REFUSAL_EXCERPT_LENGTH = 80;

export function isRunInFlight(startedAt: string | undefined, now: number, timeoutMs: number): boolean {
  if (!startedAt) return false;
  const started = Number(startedAt);
  if (!Number.isFinite(started)) return false;
  const age = now - started;
  return age >= 0 && age < timeoutMs;
}

export function isSameTarget(before: AppIdentity | undefined, after: AppIdentity | undefined): boolean {
  if (!before || !after) return false;
  if (before.bundleId && after.bundleId) return before.bundleId === after.bundleId;
  return before.path === after.path;
}

export function replaceFailureMessage(result: Extract<FinalizeResult, { ok: false }>): string {
  if (result.reason === "empty") return "The model returned no text";
  return `The model declined: ${result.text.slice(0, REFUSAL_EXCERPT_LENGTH)}`;
}

export function clipboardRestoreContent(previous: ClipboardSnapshot): ClipboardRestoreContent | undefined {
  if (previous.file) return { file: toFilePath(previous.file) };
  if (previous.html) return { html: previous.html, text: previous.text };
  if (previous.text) return { text: previous.text };
  return undefined;
}

export function isRestorable(snapshot: ClipboardSnapshot): boolean {
  return clipboardRestoreContent(snapshot) !== undefined;
}

export function restoreAction(snapshot: ClipboardSnapshot, wasEmpty: boolean): RestoreAction {
  if (isRestorable(snapshot)) return "restore";
  return wasEmpty ? "clear" : "keep";
}

export function isClipboardInfoEmpty(output: string): boolean {
  return output.trim() === "";
}

function toFilePath(file: string): string {
  return file.startsWith("file://") ? fileURLToPath(file) : file;
}
