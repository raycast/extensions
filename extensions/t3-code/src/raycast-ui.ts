import { Keyboard } from "@raycast/api";
import { Device, ThreadSummary } from "./types";

const FALLBACK_ENVIRONMENT_ID = "environment-local";
const STATUS_PREVIEW_CHARS = 140;
type ExtraModifier = Extract<Keyboard.KeyModifier, "shift" | "opt" | "alt">;
export const T3_CODE_ICON = "extension-icon.png";

export function appShortcut(
  key: Keyboard.KeyEquivalent,
  extraModifiers: ExtraModifier[] = [],
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extraModifiers], key },
    Windows: { modifiers: ["ctrl", ...extraModifiers], key },
  };
}

export function t3CodeUrl(device: Device, thread?: ThreadSummary): string {
  if (!thread) return device.baseUrl;
  const environmentId = encodeURIComponent(
    device.environmentId ?? FALLBACK_ENVIRONMENT_ID,
  );
  return `${device.baseUrl.replace(/\/$/, "")}/${environmentId}/${encodeURIComponent(thread.id)}`;
}

export function fullStatusText(
  thread: ThreadSummary,
  label: string,
  updatedText: string,
  fetchError: string | null = null,
): string {
  const pieces = [
    label,
    `${thread.modelSelection.instanceId} / ${thread.modelSelection.model}`,
    `Updated ${updatedText}`,
  ];
  if (thread.sessionLastError) pieces.push(thread.sessionLastError);
  if (thread.hasPendingApprovals) pieces.push("Needs approval");
  if (thread.hasPendingUserInput) pieces.push("Waiting for input");
  if (fetchError) pieces.push(fetchError);
  return pieces.join(" | ");
}

export function compactStatusText(status: string): string {
  if (status.length <= STATUS_PREVIEW_CHARS) return status;
  return `${status.slice(0, STATUS_PREVIEW_CHARS - 1).trimEnd()}...`;
}
