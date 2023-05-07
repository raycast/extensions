import { List } from "@raycast/api";
import { usePlayHistories } from "../helpers/nintendo";
import { DailyPlayHistoriesSection } from "./DailyPlayHistoriesSection";
import { SessionTokenGuard } from "./SessionTokenGuard";

export const RecentPlayHistoriesList = () => {
  const history = usePlayHistories();
  const longestPlayTimeThisWeek = history.data?.recentPlayHistories.reduce(
    (acc, cur) =>
      Math.max(
        acc,
        cur.dailyPlayHistories.reduce((acc, cur) => Math.max(acc, cur.totalPlayedMinutes), 0)
      ),
    0
  );
  return (
    <List navigationTitle="Recent Play Histories" isLoading={history.isLoading}>
      <SessionTokenGuard type="list">
        {history.data?.recentPlayHistories.map((history) => (
          <DailyPlayHistoriesSection history={history} timeBarMaxValue={longestPlayTimeThisWeek} />
        ))}
      </SessionTokenGuard>
    </List>
  );
};
