import { Grid } from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { IPlayHistory } from "../types/nintendo";
dayjs.extend(relativeTime);

export const PlayHistoriesGridItem = ({ history }: { history: IPlayHistory }) => {
  const totalPlayTime =
    history.totalPlayedMinutes < 60
      ? history.totalPlayedMinutes + " mins"
      : Math.floor(history.totalPlayedMinutes / 60) + " hours " + (history.totalPlayedMinutes % 60) + " mins";
  const tooltip = [
    "[" + history.titleName + "]",
    "First Played: " + dayjs(history.firstPlayedAt).fromNow(),
    "Last Played: " + dayjs(history.lastPlayedAt).fromNow(),
    "Total Playtime: " + totalPlayTime,
  ].join("\n");
  return (
    <Grid.Item
      content={{
        tooltip,
        value: history.imageUrl,
      }}
      title={history.titleName}
      subtitle={totalPlayTime}
    />
  );
};
