import { List } from "@raycast/api";
import { usePlayHistories } from "../helpers/nintendo";
import { DailyPlayHistoriesSection } from "./DailyPlayHistoriesSection";
import { SessionTokenGuard } from "./SessionTokenGuard";

export const RecentPlayHistoriesList = () => {
  const history = usePlayHistories();
  return (
    <List navigationTitle="Recent Play Histories" isLoading={history.isLoading}>
      <SessionTokenGuard type="list">
        {history.data?.recentPlayHistories.map((history) => (
          <DailyPlayHistoriesSection history={history} />
        ))}
      </SessionTokenGuard>
    </List>
  );
};
