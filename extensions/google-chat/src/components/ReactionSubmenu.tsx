import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";

import { addReaction } from "../api/chat";
import type { Message } from "../api/types";
import { showChatError } from "../helpers/feedback";

export const COMMON_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "👀", "✅", "🔥", "😮", "😢"];

/** "Add Reaction" submenu with common emoji (`spaces.messages.reactions.create`). */
export function ReactionSubmenu({ message, onReacted }: { message: Message; onReacted?: () => void }) {
  async function react(emoji: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Reacting ${emoji}` });
    try {
      await addReaction(message.name, emoji);
      toast.style = Toast.Style.Success;
      toast.title = `Reacted ${emoji}`;
      onReacted?.();
    } catch (error) {
      await toast.hide();
      await showChatError(error);
    }
  }

  return (
    <ActionPanel.Submenu title="Add Reaction" icon={Icon.Emoji} shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}>
      {COMMON_REACTIONS.map((emoji) => (
        <Action key={emoji} title={emoji} onAction={() => react(emoji)} />
      ))}
    </ActionPanel.Submenu>
  );
}
