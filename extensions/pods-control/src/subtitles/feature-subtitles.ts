import * as PodsControlCli from "../cli/client";
import { type SubtitleRevision } from "../commands/launch-context";
import { conversationAwarenessSubtitle, listeningModeSubtitle } from "../features/presentation";
import { publishCommandSubtitle, resetCommandSubtitle, withSubtitleOperation } from "../subtitles/coordination";
import type { ConversationAwarenessState, ListeningModes } from "../features/types";

async function refreshCommandSubtitle<State>(
  readState: () => Promise<State>,
  publishState: (state: State | null, revision?: SubtitleRevision) => Promise<void>,
  revision?: SubtitleRevision,
): Promise<void> {
  try {
    await publishState(await readState(), revision);
  } catch {
    await publishState(null, revision);
  }
}

export async function publishListeningModeSubtitle(
  mode: ListeningModes | null,
  revision?: SubtitleRevision,
): Promise<void> {
  if (mode) {
    await publishCommandSubtitle(listeningModeSubtitle(mode), { channel: "listening-mode", revision });
  } else {
    await resetCommandSubtitle({ channel: "listening-mode", revision });
  }
}

export async function publishConversationAwarenessSubtitle(
  state: ConversationAwarenessState | null,
  revision?: SubtitleRevision,
): Promise<void> {
  if (state) {
    await publishCommandSubtitle(conversationAwarenessSubtitle(state), { channel: "conversation-awareness", revision });
  } else {
    await resetCommandSubtitle({ channel: "conversation-awareness", revision });
  }
}

export async function refreshListeningModeSubtitle(): Promise<void> {
  try {
    await withSubtitleOperation("listening-mode", async (revision) => {
      await refreshCommandSubtitle(PodsControlCli.getListeningMode, publishListeningModeSubtitle, revision);
    });
  } catch (error) {
    console.error("Failed to coordinate listening-mode refresh", error);
  }
}

export async function refreshConversationAwarenessSubtitle(): Promise<void> {
  try {
    await withSubtitleOperation("conversation-awareness", async (revision) => {
      await refreshCommandSubtitle(
        PodsControlCli.getConversationAwareness,
        publishConversationAwarenessSubtitle,
        revision,
      );
    });
  } catch (error) {
    console.error("Failed to coordinate Conversation Awareness refresh", error);
  }
}
