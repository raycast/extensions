import { Action } from "@raycast/api";

import { getMessagesUrl } from "../helpers";
import { Chat } from "../hooks/useChats";

type CreateMessagesQuicklinkProps = {
  chat: Chat;
};

export default function CreateMessagesQuicklink({ chat }: CreateMessagesQuicklinkProps) {
  return (
    <Action.CreateQuicklink
      title="Create Messages Quicklink"
      icon={{ fileIcon: "/System/Applications/Messages.app" }}
      quicklink={{
        link: getMessagesUrl(chat),
        name: `Send Message to ${chat.displayName}`,
      }}
    />
  );
}
