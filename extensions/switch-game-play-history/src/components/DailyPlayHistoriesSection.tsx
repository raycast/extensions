import { List } from "@raycast/api";
import { IRecentPlayHistory } from "../types/nintendo";
import dayjs from "dayjs";

export const DailyPlayHistoriesSection = ({ history }: { history: IRecentPlayHistory }) => {
  const date = dayjs(history.playedDate).format("YYYY-MM-DD");
  const totalPlayedMinutes = history.dailyPlayHistories.reduce((acc, cur) => acc + cur.totalPlayedMinutes, 0);
  const sectionSubtitle = `${history.dailyPlayHistories.length} Games · ${totalPlayedMinutes} Minutes`;
  return (
    <List.Section title={date} subtitle={sectionSubtitle}>
      {history.dailyPlayHistories.map((item) => {
        return (
          <List.Item
            key={item.titleId}
            title={item.titleName}
            icon={item.imageUrl}
            accessories={[{ tag: item.totalPlayedMinutes + " mins" }]}
          />
        );
      })}
    </List.Section>
  );
};
