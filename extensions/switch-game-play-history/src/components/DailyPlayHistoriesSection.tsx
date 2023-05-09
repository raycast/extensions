import { ActionPanel, Color, List } from "@raycast/api";
import { IRecentPlayHistory } from "../types/nintendo";
import dayjs from "dayjs";
import { PushGameInfoDetailAction } from "./GameInfoDetail";

export const DailyPlayHistoriesSection = ({
  history,
  timeBarMaxValue,
}: {
  history: IRecentPlayHistory;
  timeBarMaxValue: number;
}) => {
  const date = dayjs(history.playedDate).format("YYYY-MM-DD");
  const totalPlayedMinutes = history.dailyPlayHistories.reduce((acc, cur) => acc + cur.totalPlayedMinutes, 0);
  const sectionSubtitle = `${history.dailyPlayHistories.length} Games · ${totalPlayedMinutes} Minutes`;
  return (
    <List.Section title={date} subtitle={sectionSubtitle}>
      {history.dailyPlayHistories.map((item) => {
        const timeBar = {
          tag: {
            value: [
              "\u200B",
              "\u3000".repeat(Math.floor((item.totalPlayedMinutes / timeBarMaxValue) * 10)),
              item.totalPlayedMinutes + " minutes",
              "\u200B",
            ].join(""),
            color:
              item.totalPlayedMinutes < 60 ? Color.Green : item.totalPlayedMinutes < 120 ? Color.Orange : Color.Red,
          },
        };
        return (
          <List.Item
            key={item.titleId}
            title={item.titleName}
            icon={item.imageUrl}
            accessories={[timeBar]}
            actions={
              <ActionPanel>
                <PushGameInfoDetailAction titleId={item.titleId} />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
};
