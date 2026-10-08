import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Cast, CastAuthor } from "../utils/types";
import { getUserIcon } from "../utils/helpers";
import CastDetails from "./CastDetails";

interface CastListItemProps {
  cast: Cast;
  user?: CastAuthor;
  showPowerBadge?: boolean;
  showMeta?: boolean;
}

export default function CastListItem({ cast, user, showPowerBadge, showMeta }: CastListItemProps) {
  const TITLE_CHARS_LIMIT = 95;
  const isSelf = cast.author.username === user?.username;
  const isPowerUser = cast.author.power_badge;
  const accessories: List.Item.Accessory[] = [
    ...(showPowerBadge && isPowerUser ? [{ icon: "power-badge.png" }] : []),
    ...(showMeta && !isSelf ? [{ icon: Icon.Repeat }] : []),
    { date: new Date(cast.timestamp) },
    {
      icon: getUserIcon(cast.author),
      tooltip: `Author: ${cast.author.username}`,
    },
  ];

  return (
    <List.Item
      title={cast.text.length > TITLE_CHARS_LIMIT ? `${cast.text.substring(0, TITLE_CHARS_LIMIT)}...` : cast.text}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="View Casts" icon={Icon.Sidebar} target={<CastDetails cast={cast} />} />
        </ActionPanel>
      }
    />
  );
}
