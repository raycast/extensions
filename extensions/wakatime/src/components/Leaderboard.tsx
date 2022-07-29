import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useState } from "react";

import { getDuration, getFlagEmoji } from "../utils";

export const LeaderBoardItem: React.FC<LeaderBoardItemProps> = ({
  setShowDetail,
  showDetail,
  rank,
  running_total,
  user,
}) => {
  const [md] = useState([
    `# ${user.display_name}`,
    user.is_hireable ? "**Hireable**" : "",
    user.city ? `- From ${getFlagEmoji(user.city.country_code)} ${user.city.title}` : "",
    `- Rank **#${rank}**`,
    `- Daily Average (**${getDuration(running_total.daily_average)}**)`,
    `- Hours Coded (**${getDuration(running_total.total_seconds)}**)`,
    "## Languages",
    ...running_total.languages.map((item) => `- ${item.name} (${getDuration(item.total_seconds)})`),
  ]);

  const props: Partial<List.Item.Props> = showDetail
    ? { detail: <List.Item.Detail markdown={md.join("\n\n")} /> }
    : {
        accessories: [
          { tooltip: "Hours Coded", text: getDuration(running_total.total_seconds) },
          user.city ? { tooltip: user.city.title, text: getFlagEmoji(user.city.country_code) } : {},
        ],
      };

  return (
    <List.Item
      {...props}
      id={user.id}
      subtitle={`#${rank}`}
      title={user.display_name}
      icon={{
        source: user.photo_public ? user.photo : `https://ui-avatars.com/api/?name=&size=16`,
        mask: Image.Mask.Circle,
      }}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Sidebar}
            onAction={() => setShowDetail(!showDetail)}
            title={showDetail ? "Hide Details" : "Show Details"}
          />
          {user.website ? <Action.OpenInBrowser title="Go to Website" url={user.website} /> : <></>}
          <Action.OpenInBrowser title="Go To WakaTime Profile" url={`https://wakatime.com/@${user.username}`} />
        </ActionPanel>
      }
    />
  );
};

type LeaderBoardItemProps = WakaTime.LeaderBoard["data"][number] & {
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
};
