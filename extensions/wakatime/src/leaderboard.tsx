import { Action, ActionPanel, Image, List } from "@raycast/api";

import { useLeaderBoard } from "./hooks";
import { getDuration, getFlagEmoji } from "./utils";

export default function Command() {
  const { data, isLoading } = useLeaderBoard();

  return (
    <List isLoading={isLoading}>
      {data?.data.map(({ rank, running_total, user }) => (
        <List.Item
          key={rank}
          title={user.display_name}
          subtitle={`#${rank}`}
          icon={user.photo_public ? { source: user.photo, mask: Image.Mask.Circle } : undefined}
          accessories={[
            { tooltip: "Hours Coded", text: getDuration(running_total.total_seconds, ["hours", "minutes"]) },
            user.city ? { tooltip: user.city.title, text: getFlagEmoji(user.city.country_code) } : {},
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Go To Profile" url={`https://wakatime.com/@${user.username}`} />
              {user.website ? <Action.OpenInBrowser title="Go To Website" url={user.website} /> : <></>}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
