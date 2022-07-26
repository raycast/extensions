import { useState } from "react";
import { List } from "@raycast/api";

import { getLastUpdatedIssues, searchIssues } from "./api/getIssues";

import useIssues from "./hooks/useIssues";
import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";
import useUsers from "./hooks/useUsers";

import View from "./components/View";
import IssueListItem from "./components/IssueListItem";

function SearchIssues() {
  const [query, setQuery] = useState("");

  const { issues, isLoadingIssues, mutateList } = useIssues(
    (query: string) => (query === "" ? getLastUpdatedIssues() : searchIssues(query)),
    [query],
    { keepPreviousData: true }
  );
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  const numberOfIssues = issues?.length === 1 ? "1 issue" : `${issues?.length} issues`;

  return (
    <List
      navigationTitle="Search issues"
      isLoading={isLoadingIssues || isLoadingPriorities || isLoadingMe || isLoadingUsers}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Globally search issues across projects"
    >
      <List.Section title="Updated Recently" subtitle={numberOfIssues}>
        {issues?.map((issue) => (
          <IssueListItem
            issue={issue}
            key={issue.id}
            mutateList={mutateList}
            priorities={priorities}
            users={users}
            me={me}
          />
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
