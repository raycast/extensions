import { Grid } from "@raycast/api";
import { usePlayHistories } from "../helpers/nintendo";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

// TODO
// 1. Add sorting options
export const PlayHistoriesGrid = () => {
  const history = usePlayHistories();

  const totalPlayTime = Math.floor(
    (history.data?.playHistories.reduce((a, b) => a + b.totalPlayedMinutes, 0) || 0) / 60
  );
  const gameRecords = history.data?.playHistories.length;
  const lastUpdate = dayjs(history.data?.lastUpdatedAt).format("YYYY-MM-DD HH:mm:ss");
  const sectionTitle = `Game Records (${gameRecords}) | Total Playtime (${totalPlayTime} hours)`;
  const sectionSubtitle = `Last update at (${lastUpdate})`;

  return (
    <Grid navigationTitle="Play Histories" isLoading={history.isLoading}>
      <Grid.Section title={sectionTitle} subtitle={sectionSubtitle}>
        {history.data?.playHistories
          .sort((a, b) => (a.totalPlayedMinutes > b.totalPlayedMinutes ? -1 : 1))
          .map((item) => {
            const totalPlayTime =
              item.totalPlayedMinutes < 60
                ? item.totalPlayedMinutes + " mins"
                : Math.floor(item.totalPlayedMinutes / 60) + " hours " + (item.totalPlayedMinutes % 60) + " mins";
            const itemTooltip = [
              "[" + item.titleName + "]",
              "First Played: " + dayjs(item.firstPlayedAt).fromNow(),
              "Last Played: " + dayjs(item.lastPlayedAt).fromNow(),
              "Total Playtime: " + totalPlayTime,
            ].join("\n");
            return (
              <Grid.Item
                content={{
                  tooltip: itemTooltip,
                  value: item.imageUrl,
                }}
                title={item.titleName}
                subtitle={totalPlayTime}
              />
            );
          })}
      </Grid.Section>
    </Grid>
  );
};
