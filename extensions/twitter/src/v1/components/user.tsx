import { ActionPanel, Image, List } from "@raycast/api";
import { UserV1 } from "twitter-api-v2";
import { compactNumberFormat } from "../../utils";
import { ShowUserTweetsAction } from "./user_actions";

export function UserListItem(props: { user: UserV1 }) {
  const u = props.user;
  return (
    <List.Item
      key={u.screen_name}
      title={u.name}
      subtitle={`@${u.screen_name}`}
      icon={{ source: u.profile_image_url_https, mask: Image.Mask.Circle }}
      accessoryTitle={`${compactNumberFormat(u.followers_count)}`}
      accessoryIcon={{ source: "👀" }}
      actions={
        <ActionPanel>
          <ShowUserTweetsAction user={u} />
        </ActionPanel>
      }
    />
  );
}
