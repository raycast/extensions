import * as PodsControlCli from "../cli/client";
import { CliError } from "../cli/errors";
import { type SubtitleRevision } from "../commands/launch-context";
import { conversationAwarenessHud } from "../features/presentation";
import { ToastManager } from "../feedback/toast-manager";
import { publishConversationAwarenessSubtitle } from "../subtitles/feature-subtitles";
import { runWithSubtitleOperation, showCliFailure } from "./control-operation";
import type { ConversationAwarenessState } from "../features/types";
async function publishConfirmedConversationAwareness(error: unknown, revision?: SubtitleRevision): Promise<void> {
  const state = error instanceof CliError ? PodsControlCli.confirmedConversationAwareness(error.payload) : null;
  await publishConversationAwarenessSubtitle(state, revision);
}

export async function runToggleConversationAwarenessCommand(): Promise<void> {
  const toast = new ToastManager({
    loading: "Toggling Conversation Awareness...",
    success: "Toggled Conversation Awareness",
    failure: "Failed to toggle Conversation Awareness",
  });
  await toast.setToLoading();

  const run = async (revision: SubtitleRevision): Promise<void> => {
    try {
      const currentState = await PodsControlCli.getConversationAwareness();
      const nextState: ConversationAwarenessState = currentState === "on" ? "off" : "on";
      const confirmedState = await PodsControlCli.setConversationAwareness(nextState);
      await publishConversationAwarenessSubtitle(confirmedState, revision);
      await toast.setToSuccess({ titleOverride: conversationAwarenessHud(confirmedState) });
    } catch (error) {
      await publishConfirmedConversationAwareness(error, revision);
      if (error instanceof CliError && error.code === "unsupported") {
        await toast.setToFailure({
          titleOverride: "Conversation Awareness not supported",
          error: new Error("Your connected device doesn't support Conversation Awareness."),
        });
        return;
      }
      await showCliFailure(toast, error);
    }
  };

  await runWithSubtitleOperation("conversation-awareness", toast, run);
}
