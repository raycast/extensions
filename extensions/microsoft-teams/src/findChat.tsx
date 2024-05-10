import { useEffect, useState } from "react";
import { Chat, findChats } from "./api/chat";
import { ActionPanel, Icon, List } from "@raycast/api";
import { currentUserId } from "./api/user";
import { OpenUrlAction } from "./api/util";
import { CallType, callUser } from "./actions/callAction";
import { usePromise } from "@raycast/utils";
import { getPresence } from "./api/presence";

const chatIcon = {
  oneOnOne: Icon.Person,
  group: Icon.TwoPeople,
  meeting: Icon.Calendar,
};

const presenceIcon: Record<string, string> = {
  Available: "presence_available.png",
  Away: "presence_away.png",
  BeRightBack: "presence_away.png",
  Busy: "presence_busy.png",
  DoNotDisturb: "presence_dnd.png",
  InACall: "presence_dnd.png",
  InAConferenceCall: "presence_dnd.png",
  Inactive: "presence_offline.png",
  InAMeeting: "presence_dnd.png",
  Offline: "presence_offline.png",
  OffWork: "presence_offline.png",
  OutOfOffice: "presence_oof.png",
  PresenceUnknown: "presence/presence_offline.png",
  Presenting: "presence_dnd.png",
  UrgentInterruptionsOnly: "presence_dnd.png",
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
  const [availability, setAvailability] = useState<string | undefined>(undefined);
  const { isLoading, data: currentAvailability } = usePromise(getPresence, [chat.id]);

  useEffect(() => {
    setAvailability(currentAvailability?.activity);
  }, [currentAvailability]);

  return (
    <List.Item
      icon={{
        source: isLoading
          ? Icon.CircleProgress
          : chat.chatType !== "oneOnOne"
          ? chatIcon[chat.chatType]
          : availability !== undefined
          ? presenceIcon[availability]
          : Icon.Person,
      }}
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
