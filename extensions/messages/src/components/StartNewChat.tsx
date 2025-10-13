import { Action } from "@raycast/api";

import { ChatParticipant, getMessagesUrl } from "../helpers";

type StartNewChatProps = {
  number: string;
};

export default function StartNewChat({ number }: StartNewChatProps) {
  // Build a minimal ChatParticipant so we can reuse getMessagesUrl(...)
  const chat: ChatParticipant = {
    chat_identifier: number,
    is_group: false,
    display_name: null,
    group_participants: null,
    group_name: null,
  };

  return (
    <Action.Open
      title="Start New Chat in Messages"
      icon={{ fileIcon: "/System/Applications/Messages.app" }}
      target={getMessagesUrl(chat)}
      application="Messages.app"
    />
  );
}
