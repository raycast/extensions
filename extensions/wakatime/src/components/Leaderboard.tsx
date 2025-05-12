import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useMemo } from "react";

import { getDuration, getFlagEmoji } from "../utils";

export const LeaderBoardItem: React.FC<LeaderBoardItemProps> = ({
  PageActions,
  setShowDetail,
  showDetail,
  rank,
  running_total,
  user,
}) => {
  const md = useMemo(
    () =>
      [
        `# ${user.display_name}`,
        user.is_hireable ? "**Hireable**" : "",
        user.city ? `- From ${getFlagEmoji(user.city.country_code)} ${user.city.title}` : "",
        `- Rank **#${rank}**`,
        `- Daily Average (**${getDuration(running_total.daily_average)}**)`,
        `- Hours Coded (**${getDuration(running_total.total_seconds)}**)`,
        "## Languages",
        ...running_total.languages.map((item) => `- ${item.name} (${getDuration(item.total_seconds)})`),
      ].join("\n\n"),
    [user.display_name, user.is_hireable, user.city, rank, running_total],
  );

  const props = useMemo<Partial<List.Item.Props>>(() => {
    if (showDetail) return { detail: <List.Item.Detail markdown={md} /> };

    return {
      accessories: [
        { title: "", text: getDuration(running_total.total_seconds) },
        user.city ? { title: "", tooltip: user.city.title, text: getFlagEmoji(user.city.country_code) } : null,
      ].filter((s) => s != null),
    };
  }, [md, running_total.total_seconds, showDetail, user.city]);

  return (
    <List.Item
      {...props}
      id={user.id}
      subtitle={`#${rank}`}
      title={user.display_name}
      icon={user.photo_public ? { source: user.photo, mask: Image.Mask.Circle } : getAvatarIcon(user.display_name)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Item">
            <Action
              icon={Icon.Sidebar}
              onAction={() => setShowDetail(!showDetail)}
              title={showDetail ? "Hide Details" : "Show Details"}
            />
            {user.website ? <Action.OpenInBrowser title="Go to Website" url={user.website} /> : <></>}
            <Action.OpenInBrowser title="Go to Wakatime Profile" url={`https://wakatime.com/@${user.username}`} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Page">{PageActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

type LeaderBoardItemProps = WakaTime.LeaderBoard["data"][number] & {
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
  PageActions: ActionPanel.Section.Children;
};
