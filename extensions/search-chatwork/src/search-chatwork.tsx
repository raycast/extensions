import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { DetailOfChat } from "./components/DetailOfChat";
import { getRooms, getMessagesOfAllRooms } from "./utils/chatwork-api";
import { Constants } from "./utils/constants";
import { usePromise, withAccessToken } from "@raycast/utils";
import { provider } from "./utils/oauth";

export default withAccessToken(provider)(CommandToSearchChatWork);

function CommandToSearchChatWork() {
  const { isLoading, data: CWMessageMgr } = usePromise(
    async () => {
      const rms = await getRooms();
      return await getMessagesOfAllRooms(rms);
    },
    [],
    {
      failureToastOptions: {
        title: "Chats Error",
      },
    }
  );

  return (
    <List isLoading={isLoading}>
      {CWMessageMgr?.CWRooms?.map((room) => (
        <List.Section key={room.CWRoom.room_id} title={room.CWRoom.name}>
          {room.CWMessage.map((msg) => (
            <List.Item
              key={msg.message_id}
              title={msg.body}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.AppWindow}
                    target={
                      <DetailOfChat
                        roomName={room.CWRoom.name}
                        contents={msg.body}
                        link={Constants.getCWAppLinkUrlForChat(room.CWRoom.room_id, msg.message_id)}
                      />
                    }
                  />
                  <Action.OpenInBrowser
                    icon={Constants.CW_LOGO_NAME}
                    title="Open in Chatwork"
                    url={Constants.getCWAppLinkUrlForChat(room.CWRoom.room_id, msg.message_id)}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={Constants.getCWAppLinkUrlForChat(room.CWRoom.room_id, msg.message_id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
