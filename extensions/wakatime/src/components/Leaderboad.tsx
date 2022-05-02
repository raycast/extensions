import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { getDuration, getFlagEmoji } from "../utils";

export const LeaderBoardItem: React.FC<LeaderBoardItemProps> = ({
  setShowDetail,
  showDetail,
  rank,
  running_total,
  user,
}) => {
  const props: Partial<List.Item.Props> = showDetail
    ? { detail: <List.Item.Detail markdown="" /> }
    : {
        accessories: [
          { tooltip: "Hours Coded", text: getDuration(running_total.total_seconds, ["hours", "minutes"]) },
          user.city ? { tooltip: user.city.title, text: getFlagEmoji(user.city.country_code) } : {},
        ],
      };

  return (
    <List.Item
      {...props}
      subtitle={`#${rank}`}
      title={user.display_name}
      icon={user.photo_public ? { source: user.photo, mask: Image.Mask.Circle } : undefined}
      actions={
        <ActionPanel>
          <Action title="Show Details" icon={Icon.Sidebar} onAction={() => setShowDetail(!showDetail)} />
          {user.website ? <Action.OpenInBrowser title="Go To Website" url={user.website} /> : <></>}
          <Action.OpenInBrowser title="Go To Profile" url={`https://wakatime.com/@${user.username}`} />
        </ActionPanel>
      }
    />
  );
};

type LeaderBoardItemProps = WakaTime.LeaderBoard["data"][number] & {
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
};
