import { LaunchType, type LaunchProps } from "@raycast/api";
import {
  conversationAwarenessFromSubtitleRefreshContext,
  conversationAwarenessRevisionFromSubtitleRefreshContext,
  type ConversationAwarenessSubtitleRefreshContext,
} from "./commands/launch-context";
import { runToggleConversationAwarenessCommand } from "./controls/conversation-awareness";
import { runWithCliGuard } from "./setup/guard";
import { resetCommandSubtitle } from "./subtitles/coordination";
import {
  publishConversationAwarenessSubtitle,
  refreshConversationAwarenessSubtitle,
} from "./subtitles/feature-subtitles";

type ToggleConversationAwarenessLaunchProps = LaunchProps<{
  launchContext?: ConversationAwarenessSubtitleRefreshContext;
}>;

export default async function main({ launchContext, launchType }: ToggleConversationAwarenessLaunchProps) {
  if (launchType === LaunchType.Background) {
    const state = conversationAwarenessFromSubtitleRefreshContext(launchContext);
    const revision = conversationAwarenessRevisionFromSubtitleRefreshContext(launchContext);
    if (state === undefined || revision === undefined) {
      await refreshConversationAwarenessSubtitle();
    } else {
      await publishConversationAwarenessSubtitle(state, revision);
    }
    return;
  }

  if (launchContext !== undefined) {
    await resetCommandSubtitle({ channel: "conversation-awareness" });
    throw new Error("Toggle Conversation Awareness received invalid launch context.");
  }

  await runWithCliGuard(runToggleConversationAwarenessCommand, {
    onUnavailable: () => resetCommandSubtitle({ channel: "conversation-awareness" }),
  });
}
