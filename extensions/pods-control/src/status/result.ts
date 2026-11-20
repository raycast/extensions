import { CliError } from "../cli/errors";
import type { ConversationAwarenessState, ListeningModes } from "../features/types";
export interface SubtitleDispatchResult {
  listeningMode: PromiseSettledResult<void>;
  conversationAwareness: PromiseSettledResult<void>;
}

export interface StatusRefreshResult {
  listeningMode: PromiseSettledResult<ListeningModes>;
  conversationAwareness: PromiseSettledResult<ConversationAwarenessState>;
  subtitleDispatch: SubtitleDispatchResult;
}

export function totalReadFailureIncludes(
  result: Pick<StatusRefreshResult, "listeningMode" | "conversationAwareness">,
  code: "no-device" | "unavailable",
): boolean {
  if (result.listeningMode.status !== "rejected" || result.conversationAwareness.status !== "rejected") return false;

  return [result.listeningMode.reason, result.conversationAwareness.reason].some(
    (reason) => reason instanceof CliError && reason.code === code,
  );
}
