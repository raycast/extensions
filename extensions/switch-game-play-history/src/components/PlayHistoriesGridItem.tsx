import { Grid } from "@raycast/api";
import { IPlayHistory } from "../types/nintendo";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getGameTitle, useGameTitleName } from "../helpers/nintendo";
dayjs.extend(relativeTime);

export const PlayHistoriesGridItem = ({ data }: { data: IPlayHistory }) => {
  const gameTitle = useGameTitleName(data.titleId);
  data.titleName = gameTitle.data || data.titleName;
  const totalPlayTime =
    data.totalPlayedMinutes < 60
      ? data.totalPlayedMinutes + " min"
      : Math.floor(data.totalPlayedMinutes / 60) + " hr " + (data.totalPlayedMinutes % 60) + " min";
  const tooltip = [
    "[" + data.titleName + "]",
    "First Played: " + dayjs(data.firstPlayedAt).fromNow(),
    "Last Played: " + dayjs(data.lastPlayedAt).fromNow(),
    "Total Playtime: " + totalPlayTime,
  ].join("\n");
  return (
    <Grid.Item
      content={{
        tooltip,
        value: data.imageUrl,
      }}
      title={data.titleName}
      subtitle={totalPlayTime}
    />
  );
};
