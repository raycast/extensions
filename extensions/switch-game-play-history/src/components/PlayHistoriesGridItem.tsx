import { Grid } from "@raycast/api";
import { IPlayHistory } from "../types/nintendo";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export const PlayHistoriesGridItem = ({ history }: { history: IPlayHistory }) => {
  const totalPlayTime =
    history.totalPlayedMinutes < 60
      ? history.totalPlayedMinutes + " min"
      : Math.floor(history.totalPlayedMinutes / 60) + " hr " + (history.totalPlayedMinutes % 60) + " min";
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
