import { ActionPanel, List } from "@raycast/api";
import { UserV1 } from "twitter-api-v2";
import { ShowUserTweetsAction } from "./user_actions";

export function UserListItem(props: { user: UserV1 }) {
  const u = props.user;
  return (
    <List.Item
      key={u.screen_name}
      title={u.name}
      subtitle={`@${u.screen_name}`}
      icon={{ source: u.profile_image_url_https }}
      accessoryTitle={`${u.followers_count}`}
      accessoryIcon={{ source: "👀" }}
      actions={
        <ActionPanel>
          <ShowUserTweetsAction user={u} />
        </ActionPanel>
      }
    />
  );
}
