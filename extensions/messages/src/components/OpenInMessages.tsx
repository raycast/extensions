import { Action } from "@raycast/api";

import { getMessagesUrl } from "../helpers";
import type { ChatParticipant } from "../types";

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
