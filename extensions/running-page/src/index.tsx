import { Action, ActionPanel, getPreferenceValues, Icon, LaunchProps, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { github } from "./util/auth";
import Stat from "./components/Stat";
import { useRunningPage } from "./hook/useRunningPage";
import { filterActivities, getOwnerAndRepository } from "./util/utils";
import { useEffect, useMemo, useState } from "react";
import { Activity } from "./type";

function AuthorizedComponent(launchProps: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const repository = getOwnerAndRepository(preferences.repository);
  const { data, isLoading, revalidate } = useRunningPage({ ...repository, path: preferences.path });

  const [searchDays, setSearchDays] = useState(launchProps.launchContext?.days || "all");
  const [searchData, setSearchData] = useState<Activity[] | null>(null);

  const sections = useMemo(() => {
    if (!data) return null;
    const recent = filterActivities(data, null, 28);
    const ytd = filterActivities(data, null, 365);
    const others = data.slice(recent.length + ytd.length - 1);
    return { recent, ytd, others };
  }, [data]);

  useEffect(() => {
    if (searchDays === "all") {
      setSearchData(null);
    } else if (searchDays === "recent") {
      setSearchData(sections?.recent || []);
    } else {
      setSearchData(sections?.ytd || []);
    }
  }, [searchDays, sections]);

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      searchText={launchProps.launchContext?.type}
      actions={
        <ActionPanel>
          <Action onAction={revalidate} title="Refresh" icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Select Activities Rage" defaultValue={searchDays} onChange={setSearchDays}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Past Year" value="year" />
          <List.Dropdown.Item title="Last 4 Weeks" value="recent" />
        </List.Dropdown>
      }
    >
      {searchData || sections ? (
        searchData ? (
          searchData.map((activity) => <Stat activity={activity} key={activity.run_id} />)
        ) : (
          <>
            <ListSection activities={sections!.recent} title="Last 4 Weeks" />
            <ListSection activities={sections!.ytd} title="Past Year" />
            <ListSection activities={sections!.others} title="Others" />
          </>
        )
      ) : (
        <List.EmptyView title="No data now" />
      )}
    </List>
  );
}

function ListSection({ activities, title }: { activities: Activity[]; title: string }) {
  return (
    <List.Section title={title}>
      {activities.map((activity) => (
        <Stat activity={activity} key={activity.run_id} />
      ))}
    </List.Section>
  );
}

export default withAccessToken(github)(AuthorizedComponent);
