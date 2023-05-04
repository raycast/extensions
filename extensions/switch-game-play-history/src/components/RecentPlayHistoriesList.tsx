import { List } from "@raycast/api";
import { usePlayHistories } from "../helpers/nintendo";
import { DailyPlayHistoriesSection } from "./DailyPlayHistoriesSection";

export const RecentPlayHistoriesList = () => {
  const history = usePlayHistories();
  return (
    <List navigationTitle="Recent Play Histories" isLoading={history.isLoading}>
      {history.data?.recentPlayHistories.map((history) => (
        <DailyPlayHistoriesSection history={history} />
      ))}
    </List>
  );
};
