import { withAccessToken } from "@raycast/utils";
import { createBeeperOAuth } from "./api";
import { ChatListView } from "./chat";

function UnreadChatsCommand() {
  return (
    <ChatListView
      stateKey="chat:unread"
      searchPlaceholder="Search unread chats"
      showPinnedSection={false}
      defaultFilters={{
        inbox: "inbox",
        type: "any",
        unreadOnly: true,
        includeMuted: true,
      }}
    />
  );
}

export default withAccessToken(createBeeperOAuth())(UnreadChatsCommand);
