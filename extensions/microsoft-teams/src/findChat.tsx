import { useEffect, useState } from "react";
import { Chat, findChats } from "./api/chat";
import { ActionPanel, Icon, List } from "@raycast/api";
import { currentUserId } from "./api/user";
import { OpenUrlAction } from "./api/util";
import { CallType, callUser } from "./actions/callAction";
import { usePromise } from "@raycast/utils";
import { getPresence, Presence, defaultPresence } from "./api/presence";
import { usePromiseWithTimeout } from "./hooks/usePromiseWithTimeout";

const chatIcon = {
  oneOnOne: Icon.Person,
  group: Icon.TwoPeople,
  meeting: Icon.Calendar,
};

const presenceIcon: Record<string, string> = {
  Available: "presence/presence_available.png",
  Away: "presence/presence_away.png",
  BeRightBack: "presence/presence_away.png",
  Busy: "presence/presence_busy.png",
  DoNotDisturb: "presence/presence_dnd.png",
  InACall: "presence/presence_dnd.png",
  InAConferenceCall: "presence/presence_dnd.png",
  Inactive: "presence/presence_offline.png",
  InAMeeting: "presence/presence_dnd.png",
  Offline: "presence/presence_offline.png",
  OffWork: "presence/presence_offline.png",
  OutOfOffice: "presence/presence_oof.png",
  PresenceUnknown: "presence/presence_offline.png",
  Presenting: "presence/presence_dnd.png",
  UrgentInterruptionsOnly: "presence/presence_dnd.png",
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
  const { isLoading, data: currentAvailability } = usePromiseWithTimeout<typeof getPresence>(
    getPresence,
    [chat.id],
    3000,
    defaultPresence()
  );

  useEffect(() => {
    setAvailability(currentAvailability?.activity);
  }, [currentAvailability, isLoading]);

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
