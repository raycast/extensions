import { Action } from "@raycast/api";

import { ChatParticipant, getMessagesUrl } from "../helpers";

export default function OpenInMessages({ chat }: { chat: ChatParticipant }) {
  return (
    <Action.Open
      title="Open Chat in Messages"
      icon={{ fileIcon: "/System/Applications/Messages.app" }}
      target={getMessagesUrl(chat)}
      application="Messages.app"
    />
  );
}
