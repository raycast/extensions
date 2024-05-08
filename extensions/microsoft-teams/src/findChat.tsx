import { useState } from "react";
import { Chat, findChats } from "./api/chat";
import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { currentUserId } from "./api/user";
import { OpenUrlAction } from "./api/util";
import { CallType, callUser } from "./actions/callAction";
import { usePromise } from "@raycast/utils";

const chatIcon = {
  oneOnOne: Icon.Person,
  group: Icon.TwoPeople,
  meeting: Icon.Calendar,
};

function chatMemberNames(chat: Chat) {
  const meId = currentUserId();
  const membersButMe = chat.members?.filter((m) => m.userId !== meId);
  return membersButMe?.map((m) => m.displayName) ?? [];
}

function chatTitle(chat: Chat) {
  if (chat.topic) {
    return chat.topic;
  } else {
    const memberNames = chatMemberNames(chat);
    if (memberNames.length) {
      return memberNames.join(", ");
    } else {
      const msgFrom = chat.lastMessagePreview?.from;
      return msgFrom?.application?.displayName ?? msgFrom?.user?.displayName ?? "Unknown";
    }
  }
}

function ChatItem({ chat }: { chat: Chat }) {
  return (
    <List.Item
      icon={{ source: chatIcon[chat.chatType], tintColor: Color.Purple }}
      title={chatTitle(chat)}
      accessories={[{ tag: new Date(chat.lastMessagePreview?.createdDateTime ?? chat.createdDateTime) }]}
      actions={
        <ActionPanel>
          <OpenUrlAction url={chat.webUrl} />
          <OpenUrlAction
            title={"Call Audio"}
            url={chat.webUrl}
            callback={() => callUser(CallType.Audio)}
            icon={Icon.Phone}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
          <OpenUrlAction
            title={"Call Video"}
            url={chat.webUrl}
            callback={() => callUser(CallType.Video)}
            icon={Icon.Camera}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function FindChat() {
  const [query, setQuery] = useState("");
  const { isLoading, data } = usePromise(findChats, [query]);
  return (
    <List filtering={false} isLoading={isLoading} searchText={query} onSearchTextChange={setQuery}>
      {data?.map((chat) => (
        <ChatItem key={chat.id} chat={chat} />
      ))}
    </List>
  );
}
