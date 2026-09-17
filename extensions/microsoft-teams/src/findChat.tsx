import { useEffect, useState } from "react";
import { Chat, chatMemberAddresses, chatTitle, findChats } from "./api/chat";
import { ActionPanel, Icon, List } from "@raycast/api";
import { OpenUrlAction, platformShortcut } from "./api/util";
import { CallType, createCallUrl } from "./api/links";
import { usePromise } from "@raycast/utils";
import { getPresence, defaultPresence } from "./api/presence";
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

function ChatItem({ chat }: { chat: Chat }) {
  const memberAddresses = chatMemberAddresses(chat);
  const [availability, setAvailability] = useState<string | undefined>(undefined);
  const { isLoading, data: currentAvailability } = usePromiseWithTimeout(
    getPresence,
    [chat.id],
    3000,
    defaultPresence(),
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
          {chat.chatType !== "meeting" && memberAddresses.length > 0 ? (
            <OpenUrlAction
              title="Call Audio"
              url={createCallUrl(memberAddresses, CallType.Audio)}
              icon={Icon.Phone}
              shortcut={platformShortcut(["cmd", "shift"], "a")}
            />
          ) : undefined}
          {chat.chatType !== "meeting" && memberAddresses.length > 0 ? (
            <OpenUrlAction
              title="Call Video"
              url={createCallUrl(memberAddresses, CallType.Video)}
              icon={Icon.Camera}
              shortcut={platformShortcut(["cmd", "shift"], "v")}
            />
          ) : undefined}
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
