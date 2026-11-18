import { CliError } from "./errors";
import { runCli } from "./transport";
import type { CliListeningMode, CliPayload } from "./types";
import type { ConversationAwarenessState, ListeningModes } from "../features/types";

const CLI_MODE_TOKENS: Record<ListeningModes, CliListeningMode> = {
  off: "off",
  "noise-cancellation": "noise-cancellation",
  transparency: "transparency",
  adaptive: "adaptive",
};

const EXTENSION_MODES: Record<CliListeningMode, ListeningModes> = {
  off: "off",
  transparency: "transparency",
  adaptive: "adaptive",
  "noise-cancellation": "noise-cancellation",
};

function isCliListeningMode(value: string): value is CliListeningMode {
  return Object.hasOwn(EXTENSION_MODES, value);
}

export function confirmedListeningMode(payload: CliPayload | null): ListeningModes | null {
  const mode = payload?.listeningMode;
  return typeof mode === "string" && isCliListeningMode(mode) ? EXTENSION_MODES[mode] : null;
}

export function confirmedConversationAwareness(payload: CliPayload | null): ConversationAwarenessState | null {
  const state = payload?.conversationAwareness;
  return state === "on" || state === "off" ? state : null;
}

function requireListeningMode(payload: CliPayload): ListeningModes {
  const mode = confirmedListeningMode(payload);
  if (!mode) {
    throw new CliError("invalid-response", payload, "The pods-control CLI returned an invalid listening mode.");
  }
  return mode;
}

function requireConversationAwareness(payload: CliPayload): ConversationAwarenessState {
  const state = confirmedConversationAwareness(payload);
  if (!state) {
    throw new CliError(
      "invalid-response",
      payload,
      "The pods-control CLI returned an invalid Conversation Awareness state.",
    );
  }
  return state;
}

export async function getListeningMode(): Promise<ListeningModes> {
  return requireListeningMode(await runCli(["listening-mode", "get"]));
}

export async function setListeningMode(mode: ListeningModes): Promise<ListeningModes> {
  try {
    const payload = await runCli(["listening-mode", "set", CLI_MODE_TOKENS[mode]]);
    const confirmedMode = requireListeningMode(payload);
    if (confirmedMode !== mode) {
      throw new CliError("no-op", payload);
    }
    return confirmedMode;
  } catch (error) {
    if (error instanceof CliError && error.code === "no-op" && confirmedListeningMode(error.payload) === mode) {
      return mode;
    }
    throw error;
  }
}

export async function cycleListeningMode(modes?: ListeningModes[]): Promise<ListeningModes> {
  const args = modes
    ? ["listening-mode", "cycle", "--modes", modes.map((mode) => CLI_MODE_TOKENS[mode]).join(",")]
    : ["listening-mode", "cycle"];
  return requireListeningMode(await runCli(args));
}

export async function getConversationAwareness(): Promise<ConversationAwarenessState> {
  const payload = await runCli(["conversation-awareness", "get"]);
  if (payload.conversationAwareness === null) {
    throw new CliError("unsupported", payload);
  }
  return requireConversationAwareness(payload);
}

export async function setConversationAwareness(state: ConversationAwarenessState): Promise<ConversationAwarenessState> {
  try {
    const payload = await runCli(["conversation-awareness", "set", state]);
    const confirmedState = requireConversationAwareness(payload);
    if (confirmedState !== state) {
      throw new CliError("no-op", payload);
    }
    return confirmedState;
  } catch (error) {
    if (
      error instanceof CliError &&
      error.code === "no-op" &&
      confirmedConversationAwareness(error.payload) === state
    ) {
      return state;
    }
    throw error;
  }
}
