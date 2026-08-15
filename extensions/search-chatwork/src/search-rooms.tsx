import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { getRooms } from "./utils/chatwork-api";
import { Constants } from "./utils/constants";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { provider } from "./utils/oauth";

export default withAccessToken(provider)(CommandToSearchRooms);

function CommandToSearchRooms() {
  const { isLoading, data: CWRooms } = useCachedPromise(getRooms, [], {
    initialData: [],
    failureToastOptions: {
      title: "Rooms Error",
    },
  });

  return (
    <List isLoading={isLoading}>
      {CWRooms.map((room) => {
        const accessories: List.Item.Accessory[] = [];
        if (room.sticky) accessories.push({ icon: Icon.Tack });
        if (room.last_update_time) {
          const updated = new Date(room.last_update_time * 1000);
          accessories.push({ date: updated, tooltip: `Updated: ${updated.toString()}` });
        }
        return (
          <List.Item
            key={room.room_id}
            icon={room.icon_path}
            title={room.name}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Constants.CW_LOGO_NAME}
                  title="Open in Chatwork"
                  url={Constants.getCWAppLinkUrlForRoom(room.room_id)}
                />
                <Action.CopyToClipboard title="Copy URL" content={Constants.getCWAppLinkUrlForChat(room.room_id, "")} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
