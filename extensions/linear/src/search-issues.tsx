import { useEffect, useState } from "react";
import { List } from "@raycast/api";

import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";

import View from "./components/View";
import IssueListItem from "./components/IssueListItem";
import useSearchIssues from "./hooks/useSearchIssues";
import { getPingStatus } from "./track-issue-ping";

function SearchIssues() {
  const [query, setQuery] = useState("");
  const [shouldWatchPing, setShouldWatchPing] = useState(false);

  const { isLoading, data, mutate, pagination } = useSearchIssues(query);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  useEffect(() => {
    const checkInitialPingStatus = async () => {
      const shouldPingValue = await getPingStatus();
      if (shouldPingValue) {
        setShouldWatchPing(true);
      }
    };

    checkInitialPingStatus();
  }, []);

  useEffect(() => {
    if (!shouldWatchPing) return;

    const watchPingStatus = async () => {
      const shouldPingValue = await getPingStatus();

      if (!shouldPingValue) {
        setShouldWatchPing(false); // Stop watching
        mutate(); // Reload or fetch the updated data
      }
    };

    const interval = setInterval(watchPingStatus, 200); // Check every second

    return () => clearInterval(interval);
  }, [shouldWatchPing, mutate]);

  const numberOfIssues = data?.length === 1 ? "1 issue" : `${data?.length} issues`;

  return (
    <List
      navigationTitle="Search issues"
      isLoading={isLoading || isLoadingPriorities || isLoadingMe}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Globally search issues across projects"
      pagination={pagination}
    >
      <List.Section title="Updated Recently" subtitle={numberOfIssues}>
        {data?.map((issue) => (
          <IssueListItem issue={issue} key={issue.id} mutateList={mutate} priorities={priorities} me={me} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchIssues />
    </View>
  );
}
