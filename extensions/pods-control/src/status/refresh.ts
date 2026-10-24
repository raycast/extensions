import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import * as PodsControlCli from "../cli/client";
import { type SubtitleRevision } from "../commands/launch-context";
import { CYCLE_LISTENING_MODE_COMMAND_NAME, TOGGLE_CONVERSATION_AWARENESS_COMMAND_NAME } from "../commands/names";
import { formatStatusSubtitle } from "../features/presentation";
import { publishCommandSubtitle, resetCommandSubtitle, withSubtitleSnapshotOperation } from "../subtitles/coordination";
import { finishToast } from "./feedback";
import { totalReadFailureIncludes, type StatusRefreshResult } from "./result";
import type { SubtitleDispatchResult } from "./result";
import type {
  ConversationAwarenessSubtitleRefreshContext,
  ListeningModeSubtitleRefreshContext,
} from "../commands/launch-context";
import type { StatusSnapshot, ConversationAwarenessState, ListeningModes } from "../features/types";

// Pods Status cannot set another command's subtitle, so it launches Cycle Listening Mode and
// Toggle Conversation Awareness in the background with the states it read. The revision lets
// them drop the update if a newer change landed first.
async function dispatchSubtitleRefreshes(
  mode: ListeningModes | null,
  state: ConversationAwarenessState | null,
  listeningRevision?: SubtitleRevision,
  conversationRevision?: SubtitleRevision,
): Promise<SubtitleDispatchResult> {
  const listeningContext: ListeningModeSubtitleRefreshContext = {
    operation: "refresh-listening-mode-subtitle",
    mode,
    ...(listeningRevision ? { revision: listeningRevision } : {}),
  };
  const conversationContext: ConversationAwarenessSubtitleRefreshContext = {
    operation: "refresh-conversation-awareness-subtitle",
    state,
    ...(conversationRevision ? { revision: conversationRevision } : {}),
  };
  const [listeningMode, conversationAwareness] = await Promise.allSettled([
    launchCommand({
      name: CYCLE_LISTENING_MODE_COMMAND_NAME,
      type: LaunchType.Background,
      context: listeningContext,
    }),
    launchCommand({
      name: TOGGLE_CONVERSATION_AWARENESS_COMMAND_NAME,
      type: LaunchType.Background,
      context: conversationContext,
    }),
  ]);

  return { listeningMode, conversationAwareness };
}

function logSubtitleDispatchFailures(result: SubtitleDispatchResult): void {
  if (result.listeningMode.status === "rejected") {
    console.error("Failed to dispatch Cycle Listening Mode subtitle refresh", result.listeningMode.reason);
  }
  if (result.conversationAwareness.status === "rejected") {
    console.error(
      "Failed to dispatch Toggle Conversation Awareness subtitle refresh",
      result.conversationAwareness.reason,
    );
  }
}

export async function resetStatusSubtitles(): Promise<void> {
  try {
    await withSubtitleSnapshotOperation(async (revision) => {
      await resetCommandSubtitle({ channel: "status", revision });
      logSubtitleDispatchFailures(await dispatchSubtitleRefreshes(null, null, revision, revision));
    });
  } catch (error) {
    console.error("Failed to coordinate status subtitle reset", error);
  }
}

function statusSnapshot(result: {
  listeningMode: PromiseSettledResult<ListeningModes>;
  conversationAwareness: PromiseSettledResult<ConversationAwarenessState>;
}): StatusSnapshot {
  return {
    listeningMode: result.listeningMode.status === "fulfilled" ? result.listeningMode.value : null,
    conversationAwareness:
      result.conversationAwareness.status === "fulfilled" ? result.conversationAwareness.value : null,
  };
}

async function publishStatusSubtitle(
  result: {
    listeningMode: PromiseSettledResult<ListeningModes>;
    conversationAwareness: PromiseSettledResult<ConversationAwarenessState>;
  },
  revision: SubtitleRevision,
): Promise<void> {
  const subtitle = formatStatusSubtitle(statusSnapshot(result));
  if (subtitle) {
    await publishCommandSubtitle(subtitle, { channel: "status", revision });
  } else if (totalReadFailureIncludes(result, "no-device")) {
    await publishCommandSubtitle("Not connected", { channel: "status", revision });
  } else if (totalReadFailureIncludes(result, "unavailable")) {
    await resetCommandSubtitle({ channel: "status", revision });
  }
  // Preserve the last confirmed subtitle on transient or malformed reads.
}

function rejectedStatusReadResult(reason: unknown): {
  listeningMode: PromiseRejectedResult;
  conversationAwareness: PromiseRejectedResult;
} {
  return {
    listeningMode: { status: "rejected", reason },
    conversationAwareness: { status: "rejected", reason },
  };
}

export async function refreshStatus(): Promise<StatusRefreshResult> {
  try {
    return await withSubtitleSnapshotOperation(async (revision) => {
      const [listeningMode, conversationAwareness] = await Promise.allSettled([
        PodsControlCli.getListeningMode(),
        PodsControlCli.getConversationAwareness(),
      ]);
      const result = { listeningMode, conversationAwareness };

      await publishStatusSubtitle(result, revision);

      const subtitleDispatch = await dispatchSubtitleRefreshes(
        listeningMode.status === "fulfilled" ? listeningMode.value : null,
        conversationAwareness.status === "fulfilled" ? conversationAwareness.value : null,
        revision,
        revision,
      );
      return { ...result, subtitleDispatch };
    });
  } catch (reason) {
    // A failed coordination lock is reported like a failed read. The caller
    // dispatches a neutral context without a revision, retaining the existing
    // fallback behavior of the individual subtitle commands.
    const result = rejectedStatusReadResult(reason);
    const subtitleDispatch = await dispatchSubtitleRefreshes(null, null);
    return { ...result, subtitleDispatch };
  }
}

export async function runStatusRefresh({ showFeedback }: { showFeedback: boolean }): Promise<void> {
  const toast = showFeedback
    ? await showToast({
        style: Toast.Style.Animated,
        title: "Reading status...",
      })
    : null;
  const result = await refreshStatus();

  if (toast) {
    await finishToast(toast, result);
  } else {
    logSubtitleDispatchFailures(result.subtitleDispatch);
  }
}
