import { List } from "@raycast/api";
import { IRecentPlayHistory } from "../types/nintendo";
import dayjs from "dayjs";
import { DailyPlayHistoriesListItem } from "./DailyPlayHistoriesListItem";

export const DailyPlayHistoriesSection = ({ history }: { history: IRecentPlayHistory }) => {
  const date = dayjs(history.playedDate).format("YYYY-MM-DD");
  const totalPlayedMinutes = history.dailyPlayHistories.reduce((acc, cur) => acc + cur.totalPlayedMinutes, 0);
  const sectionSubtitle = `${history.dailyPlayHistories.length} Game · ${totalPlayedMinutes} Minutes`;
  return (
    <List.Section title={date} subtitle={sectionSubtitle}>
      {history.dailyPlayHistories.map((data) => {
        return <DailyPlayHistoriesListItem data={data} />;
      })}
    </List.Section>
  );
};
