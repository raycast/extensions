import type { ListeningModes, ConversationAwarenessState } from "../features/types";

export type SubtitleRevision = string;

export interface SetListeningModeLaunchContext {
  operation: "set";
  mode: ListeningModes;
}

const LISTENING_MODES: ReadonlySet<string> = new Set(["off", "noise-cancellation", "transparency", "adaptive"]);

export function modeFromLaunchContext(context: unknown): ListeningModes | null {
  if (typeof context !== "object" || context === null) return null;

  const { operation, mode } = context as Record<string, unknown>;
  return operation === "set" && typeof mode === "string" && LISTENING_MODES.has(mode) ? (mode as ListeningModes) : null;
}

export interface ListeningModeSubtitleRefreshContext {
  operation: "refresh-listening-mode-subtitle";
  mode: ListeningModes | null;
  revision?: SubtitleRevision;
}

export interface ConversationAwarenessSubtitleRefreshContext {
  operation: "refresh-conversation-awareness-subtitle";
  state: ConversationAwarenessState | null;
  revision?: SubtitleRevision;
}

// For both refresh contexts: null means Pods Status confirmed no state, so the subtitle resets.
// undefined means the context is unusable, so the command reads the device again.
export function listeningModeFromSubtitleRefreshContext(context: unknown): ListeningModes | null | undefined {
  if (typeof context !== "object" || context === null) return undefined;

  const { operation, mode } = context as Record<string, unknown>;
  if (operation !== "refresh-listening-mode-subtitle") return undefined;
  if (mode === null) return null;
  return typeof mode === "string" && LISTENING_MODES.has(mode) ? (mode as ListeningModes) : undefined;
}

export function conversationAwarenessFromSubtitleRefreshContext(
  context: unknown,
): ConversationAwarenessState | null | undefined {
  if (typeof context !== "object" || context === null) return undefined;

  const { operation, state } = context as Record<string, unknown>;
  if (operation !== "refresh-conversation-awareness-subtitle") return undefined;
  if (state === null) return null;
  return state === "on" || state === "off" ? state : undefined;
}

function revisionFromSubtitleRefreshContext(context: unknown, operation: string): SubtitleRevision | undefined {
  if (typeof context !== "object" || context === null) return undefined;

  const { operation: contextOperation, revision } = context as Record<string, unknown>;
  return contextOperation === operation && typeof revision === "string" && revision.length > 0 ? revision : undefined;
}

export function listeningModeRevisionFromSubtitleRefreshContext(context: unknown): SubtitleRevision | undefined {
  return revisionFromSubtitleRefreshContext(context, "refresh-listening-mode-subtitle");
}

export function conversationAwarenessRevisionFromSubtitleRefreshContext(
  context: unknown,
): SubtitleRevision | undefined {
  return revisionFromSubtitleRefreshContext(context, "refresh-conversation-awareness-subtitle");
}
